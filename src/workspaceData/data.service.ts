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

    this.db.prepare(
      `create table if not exists ${this.userTablesName()}(
        id integer primary key autoincrement,
        name varchar(64)
      )`
    ).run();
  }

  public getUserTable (tableId: number) {
    return this.db.prepare(`select * from ${this.userTableName(tableId)}`).all();
  }

  public createUserTable (tableName: string, columns: Column[]): number {
    this.db.prepare(`insert into ${this.userTablesName()} (name) values (\'${tableName}\')`).run();
    const tableId = this.db.prepare(`select max(id) from ${this.userTablesName()}`).all()[0]['max(id)'];
    
    const processColumn =
      (column: Column) => `${this.userColumnName(column.name)} ${column.type}`;

    this.db.prepare(
      `create table ${this.userTableName(tableId)} (
        id integer primary key autoincrement,
        ${columns.map(processColumn).join(',\n')}
      )`
    ).run();

    return tableId;
  }

  public addOrDropColumns (tableId: number, columns: Column[], addOrDrop: boolean) {
    const getCommand = (addOrDrop, column: Column) =>
      `${addOrDrop ? 'add' : 'drop'} ${this.userColumnName(column.name)} ${column.type}`;

    this.db.prepare(columns.map(column =>
      `alter table ${this.userTableName(tableId)} ${getCommand(addOrDrop, column)};`
    ).join('\n')).run();
  }

  public addRows (tableId: number, columns: Column[], rows: Row[]) {
    const processRow = (row: Row) =>
      `(${row.fields.map((field, i) => convertField(field, columns[i].type)).join(', ')})`;

    /// TODO: iterate over views and add row to them (get max and add?)

    const processedRows = rows.map(processRow).join(', ');
    const processedColumns = columns.map(column => this.userColumnName(column.name)).join(', ');
    this.db.prepare(
      `insert into ${this.userTableName(tableId)} (${processedColumns}) values ${processedRows};`
    ).run();
  }

  public createView (tableId: number, viewName: string, columnNames: string[]) {
    /// Register new view:
    this.db.prepare(
      `create table if not exists ${this.userViewsName(tableId)} (
        id integer primary key autoincrement,
        name varchar(64)
      )`
    ).run();

    this.db.prepare(`insert into ${this.userViewsName(tableId)} (name) values(\'${viewName}\')`).run();
    const viewId = this.db.prepare(`select max(id) from ${this.userViewsName(tableId)}`).all()[0]['max(id)'];

    /// Build col map:
    const processedCols = columnNames.map((name, idx) => `(\'${name}\', ${idx})`).join(',');

    this.db.prepare(
      `create table ${this.userViewColsName(tableId, viewId)} (
        id integer primary key autoincrement,
        name varchar(64),
        idx integer
      );`
    ).run();

    this.db.prepare(
      `insert into ${this.userViewColsName(tableId, viewId)} (name, idx) values ${processedCols};`
    ).run();

    /// Build row map:
    this.db.prepare(
      `create table ${this.userViewRowsName(tableId, viewId)} (
        id integer primary key autoincrement,
        tid integer not null,
        idx integer,
        foreign key(tid) references ${this.userTableName(tableId)}(id)
          on update cascade
          on delete cascade
      );`
    ).run();

    const processedRows = this.db
      .prepare(`select id from ${this.userTableName(tableId)}`)
      .all()
      .map((row, idx) => `(${row['id']}, ${idx})`)
      .join(', ');

    this.db.prepare(
      `insert into ${this.userViewRowsName(tableId, viewId)} (tid, idx) values ${processedRows}`
    ).run();
  }

  public getView (tableId: number, viewId: number) {
    const left = this.userTableName(tableId);
    const right = this.userViewRowsName(tableId, viewId);

    const columnNames = this.db.prepare(
      `select name from ${this.userViewColsName(tableId, viewId)} order by idx`
    ).all().map(row => `${left}.${this.userColumnName(row['name'])}`).join(', ');

    return this.db.prepare(
      `select ${columnNames} from ${left}
      inner join ${right} on ${left}.id = ${right}.tid
      order by idx`
    ).all();
  }

  private readonly userTablesName = () => 'user_tables';
  private readonly userTableName = (tableId: number) => `user_table_${tableId}`;
  private readonly userViewsName = (tableId: number) => `user_table_${tableId}_views`;
  private readonly userViewRowsName = (tableId: number, viewId: number) => `user_table_${tableId}_view_${viewId}_rows`;
  private readonly userViewColsName = (tableId: number, viewId: number) => `user_table_${tableId}_view_${viewId}_cols`;
  private readonly userColumnName = (columnName: string) => `uc_${columnName}`;
}
