import { Injectable } from '@nestjs/common';
import { Database } from 'better-sqlite3';
import * as DatabaseClass from 'better-sqlite3';
import { Column } from '../models/Column';
import { toSqlType } from '../helpers/toSqlType';
import { Row } from 'src/models/Row';
import { ColumnType } from 'src/models/ColumnType';
import { fromSqlType } from 'src/helpers/fromSqlType';
import { fieldToSqlLiteral } from 'src/helpers/fieldToSqlLiteral';

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
    const tableId = this.selectMaxColumnValueFromTable(this.userTablesName());

    /// Table itself:
    this.db.prepare(
      `create table ${this.userTableName(tableId)} (id integer primary key autoincrement)`
    ).run();

    /// Table views:
    this.db.prepare(
      `create table ${this.userViewsName(tableId)} (
        id integer primary key autoincrement,
        name varchar(64)
      )`
    ).run();

    /// Table columns:
    const colsTable = this.userTableColsName(tableId);

    this.db.prepare(
      `create table ${colsTable} (
        id integer primary key autoincrement,
        name varchar(64) not null,
        type varchar(64) not null
      )`
    ).run();

    this.addColumns(tableId, columns);
    return tableId;
  }

  public addColumns (tableId: number, columns: Column[]) {
    const userTableName = this.userTableName(tableId);
    const colsTable = this.userTableColsName(tableId);

    const maxColId = this.selectMaxColumnValueFromTable(colsTable);

    /// Update table cols:
    this.db.prepare(
      `insert into ${colsTable} (name, type) values ${
        columns.map(({ name, type }) => `('${name}', '${toSqlType(type)}')`).join(', ')
      }`
    ).run();

    /// Update table itself:
    const sqlColumns = this.db.prepare(`select id, type from ${colsTable} where id > ${maxColId}`).all();

    sqlColumns.forEach(({ id, type }) => this.db.prepare(
      `alter table ${userTableName} add column ${this.userColumnName(id)} ${type}`
    ).run());

    const newCols = sqlColumns.map(({ id }) => id);

    /// Update views when new column is appended
    this.db.prepare(`select id from ${this.userViewsName(tableId)}`).all().forEach(
      ({ id }) => {
        const currentView = this.userViewColsName(tableId, id);
        const maxIdx = this.selectMaxColumnValueFromTable(currentView, 'idx');
        const newColsAndIndicesValues = newCols.map((colId, i) => `(${colId}, ${maxIdx + 1 + i})`).join(', ');
        this.db.prepare(`insert into ${currentView} (tid, idx) values ${newColsAndIndicesValues}`).run();
      }
    );
  }

  public dropColumns (tableId: number, columnIds: number[]) {
    columnIds.forEach(id => {
      this.db.prepare(`alter table ${this.userTableName(tableId)} drop column ${this.userColumnName(id)}`).run();
      this.db.prepare(`delete from ${this.userTableColsName(tableId)} where id = ${id}`).run();
    });
  }

  public insertRows (tableId: number, columnIds: number[], rows: Row[]) {
    const tableName = this.userTableName(tableId);
    const tableColsName = this.userTableColsName(tableId);
    const maxRowId = this.selectMaxColumnValueFromTable(tableName);

    const columnTypes: ColumnType[] = columnIds
      .map(id => this.db.prepare(`select type from ${tableColsName} where id = ${id}`).all()[0]['type'])
      .map(sqlType => fromSqlType(sqlType));

    const processedRows = rows.map(row =>
      `(${row.fields.map((field, i) => fieldToSqlLiteral(field, columnTypes[i])).join(', ')})`
    ).join(', ');
    const processedColumns = columnIds.map(id => this.userColumnName(id)).join(', ');
    this.db.prepare(
      `insert into ${tableName} (${processedColumns}) values ${processedRows};`
    ).run();

    const newRows = this.db
      .prepare(`select id from ${tableName} where id > ${maxRowId}`).all()
      .map(row => row['id']);

    /// Update views when new row is appended
    this.db.prepare(`select id from ${this.userViewsName(tableId)}`).all().forEach(
      ({ id }) => {
        const currentView = this.userViewRowsName(tableId, id);
        const maxIdx = this.selectMaxColumnValueFromTable(currentView, 'idx');
        const newRowsAndIndicesValues = newRows.map((rowId, i) => `(${rowId}, ${maxIdx + 1 + i})`).join(', ');
        this.db.prepare(`insert into ${currentView} (tid, idx) values ${newRowsAndIndicesValues}`).run();
      }
    );
  }

  public deleteRows (tableId: number, rowIds: number[]) {
    const predicate = rowIds.map(rowId => `id = ${rowId}`).join(' or ');
    const tableName = this.userTableName(tableId);
    this.db.prepare(`delete from ${tableName} where ${predicate}`).run();
  }

  public createView (tableId: number, viewName: string) {
    /// Register new view:
    this.db.prepare(`insert into ${this.userViewsName(tableId)} (name) values(\'${viewName}\')`).run();
    const viewId = this.selectMaxColumnValueFromTable(this.userViewsName(tableId));

    /// Build col map:
    const colValues = this.db
      .prepare(`select id from ${this.userTableColsName(tableId)}`).all()
      .map(({ id }, idx) => `(\'${id}\', ${idx})`).join(',');

    this.db.prepare(
      `create table ${this.userViewColsName(tableId, viewId)} (
        id integer primary key autoincrement,
        tid integer not null,
        idx integer not null,
        active boolean not null default true,
        foreign key(tid) references ${this.userTableColsName(tableId)}(id)
          on update cascade
          on delete cascade
      );`
    ).run();

    this.db.prepare(
      `insert into ${this.userViewColsName(tableId, viewId)} (tid, idx) values ${colValues};`
    ).run();

    /// Build row map:
    const rowValues = this.db
      .prepare(`select id from ${this.userTableName(tableId)}`).all()
      .map(({ id }, idx) => `(${id}, ${idx})`).join(', ');

    this.db.prepare(
      `create table ${this.userViewRowsName(tableId, viewId)} (
        id integer primary key autoincrement,
        tid integer not null,
        idx integer not null,
        foreign key(tid) references ${this.userTableName(tableId)}(id)
          on update cascade
          on delete cascade
      );`
    ).run();

    this.db.prepare(
      `insert into ${this.userViewRowsName(tableId, viewId)} (tid, idx) values ${rowValues}`
    ).run();
  }

  public toggleViewColumns (tableId: number, viewId: number, columnId: number[], active: boolean) {
    const predicate = columnId.map(colId => `tid = ${colId}`).join(' or ');
    this.db.prepare(
      `update ${this.userViewColsName(tableId, viewId)}
      set active = ${active ? 1 : 0}
      where ${predicate}`
    ).run();;
  }

  public shiftViewColumns (tableId: number, viewId: number, sIdx: number, tIdx: number) {
    this.shiftViewRecordIdx(this.userViewColsName(tableId, viewId), sIdx, tIdx);
  }

  public shiftViewRows (tableId: number, viewId: number, sIdx: number, tIdx: number) {
    this.shiftViewRecordIdx(this.userViewRowsName(tableId, viewId), sIdx, tIdx);
  }

  private shiftViewRecordIdx (table: string, sIdx: number, tIdx: number) {
    if (sIdx === tIdx)
      return;

    const isLeftShift : boolean = tIdx < sIdx;
    const l = Math.min(sIdx, tIdx);
    const r = Math.max(sIdx, tIdx);

    this.db.prepare(`update ${table} set idx = -1 where idx = ${sIdx}`).run();

    this.db.prepare(
      `update ${table}
      set idx = idx ${isLeftShift ? '+' : '-'} 1
      where idx ${isLeftShift ? '>=' : '>'} ${l} and idx ${isLeftShift ? '<' : '<='} ${r}`
    ).run();

    this.db.prepare(`update ${table} set idx = ${tIdx} where idx = -1`).run();
  }

  public getView (tableId: number, viewId: number, limit: number, offset: number) {
    const tCols = this.userTableColsName(tableId);
    const vCols = this.userViewColsName(tableId, viewId);

    const columnNames = this.db.prepare(
      `select ${tCols}.id from
      ${tCols} inner join (select * from ${vCols} where active) as filtered
      on ${tCols}.id = filtered.tid
      order by idx`
    ).all().map(({ id }) => this.userColumnName(id)).join(', ');

    const tRows = this.userTableName(tableId);
    const vRows = this.userViewRowsName(tableId, viewId);

    /// should add order by twice so the pagination is supported
    return this.db.prepare(
      `select ${columnNames} from
      ${tRows} inner join (select * from ${vRows} order by idx limit ${offset}, ${limit}) as page
      on ${tRows}.id = page.tid
      order by idx`
    ).all();
  }

  private readonly userTablesName = () => 'user_tables';
  private readonly userTableName = (tableId: number) => `user_table_${tableId}`;
  private readonly userTableColsName = (tableId: number) => `user_table_${tableId}_cols`;
  private readonly userViewsName = (tableId: number) => `user_table_${tableId}_views`;
  private readonly userViewRowsName = (tableId: number, viewId: number) => `user_table_${tableId}_view_${viewId}_rows`;
  private readonly userViewColsName = (tableId: number, viewId: number) => `user_table_${tableId}_view_${viewId}_cols`;
  private readonly userColumnName = (columnId: number) => `uc_${columnId}`;

  private selectMaxColumnValueFromTable = (tableName: string, columnName = 'id') => {
    const rows = this.db.prepare(`select ${columnName} from ${tableName} order by ${columnName} desc limit 1`).all();
    return rows.length === 0 ? 0 : rows[0][columnName];
  }
}
