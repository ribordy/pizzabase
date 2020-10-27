import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { NormalAddress } from "../lib/validator";
import { Location } from "./Location";
import { Report } from "./Report";
import { Action } from "./Action";

export enum OrderTypes {
  pizzas = "pizzas",
  donuts = "donuts",
}

export const ORDER_TYPE_TO_MEALS: {
  [key in OrderTypes]: number;
} = {
  [OrderTypes.pizzas]: 14,
  [OrderTypes.donuts]: 12,
};

@Entity({ name: "orders" })
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "double precision" })
  cost: number;

  @Column({ type: "int" })
  meals: number;

  @Column({ name: "order_type", default: "pizzas" })
  @Index()
  orderType: OrderTypes;

  @Column({ type: "int" })
  quantity: number;

  @Column({ nullable: true })
  @Index()
  restaurant: string | null;

  @ManyToOne((_type) => Location, (location) => location.orders, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: "location_id" })
  @Index()
  location!: Location;

  @OneToMany((_type) => Report, (report) => report.order)
  reports: Promise<Report[]>;

  @CreateDateColumn({ name: "created_at" })
  createdAt;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt;

  asJSON(showPrivate: boolean = false) {
    if (showPrivate) return this.asJSONPrivate();

    const { id, meals, restaurant, createdAt } = this;
    return {
      id,
      pizzas: meals,
      restaurant,
      createdAt,
    };
  }

  asJSONPrivate() {
    const { cost } = this;
    return {
      ...this.asJSON(),
      cost,
    };
  }

  static async placeOrderForAddress(
    orderParams: {
      quantity: number;
      cost: number;
      restaurant?: string;
      user?: string;
    },
    address: NormalAddress
  ): Promise<[Order, Report[]]> {
    const [location] = await Location.getOrCreateFromAddress(address);

    return await this.placeOrder(orderParams, location);
  }

  static async placeOrder(
    {
      cost,
      orderType,
      quantity,
      restaurant,
      user,
    }: {
      cost: number;
      quantity: number;
      restaurant?: string;
      orderType?: OrderTypes;
      user?: string;
    },
    location: Location
  ): Promise<[Order, Report[]]> {
    const order = new this();

    order.quantity = quantity;
    order.orderType = orderType || OrderTypes.pizzas;
    order.meals = quantity * ORDER_TYPE_TO_MEALS[order.orderType];
    order.cost = cost;
    order.restaurant = restaurant;
    order.location = location;

    await order.save();
    const openReports = await location.openReports();
    await Report.updateOpen(location, { order });
    await location.validate(user);

    await Action.log(order, "ordered", user);

    return [order, openReports];
  }
}
