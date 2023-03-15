export enum TRANSACTIONSTATUS {
  INITIATED,
  DEBITING,
  DEBITED,
  SETTLING,
  SETTLED,
  FAILED,
}

export enum TRANSACTIONKIND {
  ONRAMP,
  OFFRAMP,
}

export enum STABLES {
  USDC,
  USDT
}

export enum FIATCURRENCY {
  GHS
}

export enum PAYBOXMODE {
  TEST = 'Test',
  CASH = 'Cash',
  MOBILEMONEY = 'MobileMoney',
  CARD = 'Card',
}
