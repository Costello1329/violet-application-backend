import { ColumnType } from 'src/models/ColumnType';


export function toSqlType (type: ColumnType) {
  switch (type) {
    case ColumnType.Integer: return 'integer';
    case ColumnType.String: return 'varchar(255)';
    case ColumnType.Boolean: return 'boolean';
    default: return null;
  }
}
