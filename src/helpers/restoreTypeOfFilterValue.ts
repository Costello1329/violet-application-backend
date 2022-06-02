import { ColumnType } from 'src/models/ColumnType';

export const restoreTypeOfFilterValue = (sqlLiteral: any, columnType: ColumnType): any => {
  switch (columnType) {
    case ColumnType.Integer: return sqlLiteral * 1;
    case ColumnType.String: return sqlLiteral;
    case ColumnType.Boolean: return !!sqlLiteral;
  }
}
