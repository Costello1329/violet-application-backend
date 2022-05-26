import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Column } from 'src/models/Column';
import { ColumnType } from 'src/models/ColumnType';
import { Row } from 'src/models/Row';
import { DataService } from './data.service';


@Controller()
export class DataController {
  public constructor (private readonly dataService: DataService) {}

  // public async getTable (@Param() params) {
  //   const cols = [{ name: "name", type: ColumnType.String }];
  //   const tableId = this.dataService.addTable("employee", cols);

  //   const newCols = [{ name: "last_name", type: ColumnType.String }, { name: "age", type: ColumnType.Integer }];
  //   this.dataService.addOrDropColumns(tableId, newCols, true);

  //   this.dataService.addRows(tableId, [...cols, ...newCols], [
      // { fields: ["george", "johns",  31] },
      // { fields: ["john", "ziggs", 18] },
      // { fields: ["ker", "figgs", 11] },
      // { fields: ["dim", "higgs", 51] }
  //   ]);
  // }

  @Get('table/:id')
  public getTable (@Param() params): string {
    const tableData = this.dataService.getTable(params.id);
    if (tableData.length === 0)
      return "";

    const table: string[][] = [];

    const columns = Object.keys(tableData[0]);
    table.push(["Table", ...columns]);

    for (let row = 0; row < tableData.length; row ++) {
      console.info(Object.values(tableData[row]));
      table.push([
        row.toString(), ...Object.values(tableData[row])
          .map(val =>val !== null ? val.toString() : "")
      ]);
    }

    let data: string = "";

    for (let row = 0; row < table.length; row ++)
      data += `<tr>${table[row].map(el => `<td>${el}</td>`).join("")}</tr>`;

    return `<table><tbody>${data}</tbody></table>`;
  }

  @Post("table/add")
  public newTable (
    @Body('tableName') tableName: string,
    @Body('columns') columns: Column[]
  ): string {
    return `New table created: ${this.dataService.addTable(tableName, columns)}`;
  }

  @Post("table/alter")
  public alterColumns (
    @Body('tableId') tableId: number,
    @Body('columns') columns: Column[],
    @Body('type') type: "add" | "drop"
  ): string {
    this.dataService.addOrDropColumns(tableId, columns, type === "add");
    return "done";
  }

  @Post("table/append")
  public insert (
    @Body('tableId') tableId: number,
    @Body('columns') columns: Column[],
    @Body('rows') rows: Row[]
  ): void {
    this.dataService.addRows(tableId, columns, rows);
  }

  // @Put('fill')
  // public async fillDatabaseWithData (
  //   @Body('workSpacesCountMin') workSpacesCountMin: number,
  //   @Body('workSpacesCountMax') workSpacesCountMax: number,
  //   @Body('tablesCountMin') tablesCountMin: number,
  //   @Body('tablesCountMin') tablesCountMax: number,
  //   @Body('columnsCountMin') columnsCountMin: number,
  //   @Body('columnsCountMax') columnsCountMax: number,
  //   @Body('rowsCountMin') rowsCountMin: number,
  //   @Body('rowsCountMax') rowsCountMax: number
  // ): Promise<string> {
  //   return this.dataService.clearDataBase()
  //     .then(() => this.dataService.addColumnTypes())
  //     .then(() => this.dataService.genTestData(
  //       [workSpacesCountMin, workSpacesCountMax],
  //       [tablesCountMin, tablesCountMax],
  //       [columnsCountMin, columnsCountMax],
  //       [rowsCountMin, rowsCountMax]
  //     )).then(() => "finished");
  // }
}
