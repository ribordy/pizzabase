import { NextFunction, Request, Response } from "express";
import { Truck } from "../entity/Truck";
import { isAuthorized } from "./helper";
import { validateTruck } from "../lib/validator";
import { zapTruckReport } from "../lib/zapier";

export class TrucksController {
  async all(request: Request, _response: Response, _next: NextFunction) {
    const limit = Number(request.query.limit || 100);
    const take = limit < 100 ? limit : 100;
    const skip = Number(request.query.page || 0) * limit;

    const [trucks, count] = await Truck.findAndCountActiveTrucks({
      take,
      skip,
    });

    return {
      results: trucks.map(({ identifier, createdAt, location }) => ({
        createdAt,
        region: identifier,
        location: location.asJSON(),
      })),
      count,
    };
  }
  async create(request: Request, response: Response, next: NextFunction) {
    if (!(await isAuthorized(request, response, next))) return null;
    const { errors, normalizedAddress, identifier } = await validateTruck(
      request.body || {}
    );

    if (Object.keys(errors).length > 0) {
      response.status(422);
      return { errors };
    }

    const [truck, openReports] = await Truck.createForAddress(
      normalizedAddress,
      identifier,
      request.body?.user
    );
    for (const report of openReports) {
      await zapTruckReport(report);
    }

    return {
      address: truck.location.fullAddress,
    };
  }
}
