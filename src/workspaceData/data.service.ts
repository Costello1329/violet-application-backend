import { Injectable } from '@nestjs/common';
import { Database } from 'better-sqlite3';
import * as DatabaseClass from 'better-sqlite3';
import { Column } from '../models/Column';
import { Row } from '../models/Row';
import { convertField } from '../helpers/parseField';

@Injectable()
export class DataService {
  private db: Database;

  constructor () {
    this.db = new DatabaseClass('src/db/workspace.db');
    this.setupDb();
  }

  private setupDb () {
    this.db.prepare(
      `create table if not exists user_table(
        id integer primary key autoincrement,
        name varchar(64)
      )`
    ).run();
  }

  public getTable (tableId: number) {
    return this.db.prepare(`select * from user_table_${tableId}`).all();
  }

  public addTable (tableName: string, columns: Column[]): number {
    this.db.prepare(`insert into user_table (name) values (\'${tableName}\')`).run();
    const tableId = this.db.prepare('select max(id) from user_table').all()[0]['max(id)'];
    
    const processColumn = (column: Column) =>
      `${column.name} ${column.type}`;
    
    this.db.prepare(
      `create table user_table_${tableId} (${columns.map(processColumn).join(", ")})`
    ).run();

    return tableId;
  }

  public addOrDropColumns (tableId: number, columns: Column[], addOrDrop: boolean) {
    const getCommand = (addOrDrop, column: Column) =>
      `${addOrDrop ? "add" : "drop"} ${column.name} ${column.type}`;

    for (const column of columns)
      this.db.prepare(`alter table user_table_${tableId} ${getCommand(addOrDrop, column)}`).run();
  }

  public addRows (tableId: number, columns: Column[], rows: Row[]) {
    const processRow = (row: Row) => {
      return `(${row.fields.map((field, i) => convertField(field, columns[i].type)).join(", ")})`;
    }

    const processedRows = rows.map(processRow).join(", ");

    const processedColumns =
      columns.map(column => column.name).join(", ");

    console.info(processedRows);
    console.info(processedColumns);

    const cmd = `insert into user_table_${tableId} (${processedColumns}) values ${processedRows};`;
    this.db.prepare(cmd).run();
  }
}
