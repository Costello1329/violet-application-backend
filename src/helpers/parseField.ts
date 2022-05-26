import { ColumnType } from "src/models/ColumnType";

export const convertField = (field: any, columnType: ColumnType): string => {
  switch (columnType) {
    case ColumnType.Integer: return "" + field;
    case ColumnType.String: return `\'${field}\'`;
  }
}
