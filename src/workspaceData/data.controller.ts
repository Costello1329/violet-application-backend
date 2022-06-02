import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Column } from 'src/models/Column';
import { ColumnType } from 'src/models/ColumnType';
import { FilterOperator, NumberFilterOperator } from 'src/models/FilterOperator';
import { Row } from 'src/models/Row';
import { DataService } from './data.service';


@Controller()
export class DataController {
  public constructor (private readonly dataService: DataService) {}

  private drawSelectResult (tableData): string {
    if (tableData.length === 0)
      return '';

    const table: string[][] = [];

    const columns = Object.keys(tableData[0]);
    table.push(['Table', ...columns]);

    for (let row = 0; row < tableData.length; row ++)
      table.push([
        row.toString(), ...Object.values(tableData[row])
          .map(val =>val !== null ? val.toString() : '')
      ]);

    let data: string = '';

    for (let row = 0; row < table.length; row ++)
      data += `<tr>${table[row].map(el => `<td>${el}</td>`).join('')}</tr>`;

    return `<table><tbody>${data}</tbody></table>`;
  }

  @Post('table/create')
  public createTable (
    @Body('tableName') tableName: string,
    @Body('columns') columns: Column[]
  ): number {
    return this.dataService.createUserTable(tableName, columns);
  }

  @Post('table/add_columns')
  public addColumns (
    @Body('tableId') tableId: number,
    @Body('columns') columns: Column[],
  ) {
    this.dataService.addColumns(tableId, columns);
  }

  @Post('table/drop_columns')
  public dropColumns (
    @Body('tableId') tableId: number,
    @Body('columnIds') columnIds: number[],
  ) {
    this.dataService.dropColumns(tableId, columnIds);
  }

  @Post('table/insert_rows')
  public insertRows (
    @Body('tableId') tableId: number,
    @Body('columnIds') columnIds: number[],
    @Body('rows') rows: Row[]
  ): void {
    this.dataService.insertRows(tableId, columnIds, rows);
  }

  @Post('table/delete_rows')
  public deleteRows (
    @Body('tableId') tableId: number,
    @Body('rowIds') rowIds: number[]
  ): void {
    this.dataService.deleteRows(tableId, rowIds);
  }

  @Post('view/create')
  public createView (
    @Body('tableId') tableId: number,
    @Body('viewName') viewName: string
  ) {
    this.dataService.createView(tableId, viewName);
  }

  @Post('view/toggle_columns')
  public toggleColumns (
    @Body('tableId') tableId: number,
    @Body('viewId') viewId: number,
    @Body('columnIds') columnIds: number[],
    @Body('active') active: boolean
  ) {
    this.dataService.toggleViewColumns(tableId, viewId, columnIds, active);
  }

  @Post('view/shift_columns')
  public shiftColumns (
    @Body('tableId') tableId: number,
    @Body('viewId') viewId: number,
    @Body('sIdx') sIdx: number,
    @Body('tIdx') tIdx: number
  ) {
    this.dataService.shiftViewColumns(tableId, viewId, sIdx, tIdx);
  }

  @Post('view/shift_rows')
  public shiftRows (
    @Body('tableId') tableId: number,
    @Body('viewId') viewId: number,
    @Body('sIdx') sIdx: number,
    @Body('tIdx') tIdx: number
  ) {
    this.dataService.shiftViewRows(tableId, viewId, sIdx, tIdx);
  }

  @Post('view/add_filter')
  public addFilter (
    @Body('tableId') tableId: number,
    @Body('viewId') viewId: number,
    @Body('columnId') columnId: number,
    @Body('value') value: any,
    @Body('operator') operator: FilterOperator
  ) {
    this.dataService.addFilter(tableId, viewId, columnId, value, operator);
  }

  @Post('view/remove_filter')
  public removeFilter (
    @Body('tableId') tableId: number,
    @Body('viewId') viewId: number,
    @Body('filterId') filterId: number
  ) {
    this.dataService.removeFilter(tableId, viewId, filterId);
  }

  @Get('table/:id')
  public getTable (@Param() params): string {
    return this.drawSelectResult(this.dataService.getUserTable(params.id));
  }

  @Get('table/:table_id/view/:view_id/:page_id')
  public getView (@Param() params) {
    const pageSize = 100;
    return this.drawSelectResult(this.dataService.getView(
      params.table_id,
      params.view_id,
      pageSize,
      params.page_id * pageSize
    ));
  }

  /// Test:
  @Post('prepare_test')
  public prepareTest () {
    const width = 100;
    const height = 10000;

    const maxNumVal = 1000;

    const columns: Column[] = [];
    const rows: Row[] = [];

    for (let i = 0; i < width; i ++)
      columns.push({ name: `col_${i}`, type: i % 10 === 0 ? ColumnType.Integer : ColumnType.String});

    for (let i = 0; i < height; i ++)
      rows.push({ fields: columns.map(({ type }) =>
        type === ColumnType.Integer ?
          Math.floor(Math.random() * maxNumVal) :
          randomUUID().split('-')[0]
      )});

    const tableId = this.createTable('Just a table', columns);
    this.insertRows(tableId, columns.map((_, i) => i + 1), rows);
    this.createView(tableId, 'New view');

    for (let i = 0; i < width - 1; i ++)
      this.shiftColumns(tableId, 1, width - 1, i);

    this.toggleColumns(tableId, 1, Array.from(Array(width / 2).keys()).map(i => 2 + i * 2), false);

    for (let i = 0; i < width / 10; i ++)
      this.addFilter(
        tableId, 1, 10 * i + 1,
        i % 2 === 0 ? 100 : 900,
        i % 2 === 0 ? NumberFilterOperator.greater : NumberFilterOperator.less
      );
  }
}
