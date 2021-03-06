import { normalizeAddress, NormalAddress } from "./normalizeAddress";
import { ADDRESS_ERROR, COST_ERROR } from "./constants";

const COST_PER_PIZZA = 16;

interface ValidationError {
  cost?: string;
  address?: string;
}

export const validateOrder = async ({
  pizzas: sentPizza,
  cost: sentCost,
  restaurant,
  user,
  address,
}: {
  pizzas?: string;
  cost?: string;
  restaurant?: string;
  user?: string;
  address?: string;
}): Promise<{
  pizzas: number;
  cost: number;
  restaurant?: string;
  user?: string;
  normalizedAddress?: NormalAddress;
  errors: ValidationError;
}> => {
  const errors: ValidationError = {};

  const cost =
    `${sentCost}`.length > 0
      ? Math.round(Number(`${sentCost}`.match(/[0-9]|\./g)?.join("")) * 100) /
        100
      : null;
  if (!cost) {
    errors.cost = COST_ERROR;
  }
  let normalizedAddress: null | NormalAddress;
  if (!!address) {
    normalizedAddress = await normalizeAddress(address);
    if (!normalizedAddress) {
      errors.address = ADDRESS_ERROR;
    }
  }

  const pizzas = isNaN(Number(sentPizza))
    ? Math.ceil(cost / COST_PER_PIZZA)
    : Number(sentPizza);

  return { errors, cost, pizzas, user, restaurant, normalizedAddress };
};
