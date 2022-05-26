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

  public createTable (tableName: string, columns: Column[]): number {
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

    const cmd = `insert into user_table_${tableId} (${processedColumns}) values ${processedRows};`;
    this.db.prepare(cmd).run();
  }

  public createView (tableId: number, name: string, columnNames: string[], rowIndices: number[]) {
    /// Register new view:
    this.db.prepare(
      `create table if not exists user_table_${tableId}_views (
        id integer primary key autoincrement,
        name varchar(64)
      )`
    ).run();

    this.db.prepare(`insert into user_table_${tableId}_views (name) values(\'${name}\')`).run();
    const viewId = this.db.prepare(`select max(id) from user_table_${tableId}_views`).all()[0]['max(id)'];

    /// Build cols map:
    const colsTableName = `user_table_${tableId}_view_${viewId}_cols`;

    this.db.prepare(
      `create table ${colsTableName} (
        id integer primary key autoincrement,
        table_column_name varchar(64),
        view_col_idx integer
      )`
    ).run();

    const processedCols = columnNames.map((name, idx) => `(\'${name}\', ${idx})`).join(",");

    this.db.prepare(
      `insert into ${colsTableName} (table_column_name, view_col_idx) values ${processedCols};`
    ).run();

    // Build rows map:
    const rowsTableName = `user_table_${tableId}_view_${viewId}_rows`;

    this.db.prepare(
      `create table ${rowsTableName} (
        id integer primary key autoincrement,
        table_row_idx integer,
        view_row_idx integer
      )`
    ).run();

    const processedRows = rowIndices.map((initialIdx, idx) => `(${initialIdx}, ${idx})`).join(",");

    this.db.prepare(
      `insert into ${rowsTableName} (table_row_idx, view_row_idx) values ${processedRows};`
    ).run();
  }

  public getView (tableId: number, viewId: number) {
    const colsTableName = `user_table_${tableId}_view_${viewId}_cols`;
    const columnNames = this.db.prepare(
      `select table_column_name from ${colsTableName} order by view_col_idx`
    ).all().map(row => row['table_column_name']).join(", ");
    
    const rowsTableName = `user_table_${tableId}_view_${viewId}_rows`;
    const rowIdices = this.db.prepare(
      `select table_row_idx from ${rowsTableName} order by view_row_idx`
    ).all().map(row => row['table_row_idx']);

    let view: any[] = rowIdices.map(idx => this.db.prepare(
      `select ${columnNames} from user_table_${tableId} limit ${idx}, 1`
    ).all()[0]);
    
    return view;
  }
}
