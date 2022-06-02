import { ColumnType } from 'src/models/ColumnType';

export const fieldToSqlLiteral = (field: any, columnType: ColumnType): string => {
  switch (columnType) {
    case ColumnType.Integer: return "" + field;
    case ColumnType.String: return `\'${field}\'`;
  }
}
