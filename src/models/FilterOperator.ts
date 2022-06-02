export type FilterOperator =
  GeneralFilterOperator |
  NumberFilterOperator |
  BooleanFilterOperator |
  StringFilterOperator;

export enum GeneralFilterOperator {
  isEmpty = 'isEmpty',
  isNotEmpty = 'isNotEmpty',
}

export enum NumberFilterOperator {
  less = 'less',
  lessEqual = 'lessEqual',
  greater = 'greater',
  greaterEqual = 'greaterEqual',
  equal = 'equal',
  notEqual = 'notEqual'
}

export enum BooleanFilterOperator {
  is = 'is',
}

export enum StringFilterOperator {
  like = 'like',
  notLike = 'notLike'
}
