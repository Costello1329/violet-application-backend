import { ColumnType } from 'src/models/ColumnType';


export function fromSqlType (sqlType: string) {
  switch (sqlType) {
    case 'integer': return ColumnType.Integer;
    case 'varchar(255)': return ColumnType.String;
    case 'boolean': return ColumnType.Boolean;
    default: return null;
  }
}
