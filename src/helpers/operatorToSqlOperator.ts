import { BooleanFilterOperator, FilterOperator, GeneralFilterOperator, NumberFilterOperator, StringFilterOperator } from "src/models/FilterOperator";

export function operatorToSqlOperator (operator: FilterOperator) {
  switch (operator) {
    case GeneralFilterOperator.isEmpty: return 'is null';
    case GeneralFilterOperator.isNotEmpty: return 'is not null';
    case NumberFilterOperator.less: return '<';
    case NumberFilterOperator.lessEqual: return '<=';
    case NumberFilterOperator.greater: return '>';
    case NumberFilterOperator.greaterEqual: return '>=';
    case NumberFilterOperator.equal: return '=';
    case NumberFilterOperator.notEqual: return '!=';
    case BooleanFilterOperator.is: return '=';
    case StringFilterOperator.like: return 'like';
    case StringFilterOperator.notLike: return 'not like';
  }
}
