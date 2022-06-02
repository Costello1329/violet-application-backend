import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Column } from 'src/models/Column';
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
  ): string {
    return `New table created: ${this.dataService.createUserTable(tableName, columns)}`;
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
}
