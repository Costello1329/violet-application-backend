import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Column } from 'src/models/Column';
import { Row } from 'src/models/Row';
import { DataService } from './data.service';


@Controller()
export class DataController {
  public constructor (private readonly dataService: DataService) {}

  @Get('table/:id')
  public getTable (@Param() params): string {
    const tableData = this.dataService.getTable(params.id);
    if (tableData.length === 0)
      return "";

    const table: string[][] = [];

    const columns = Object.keys(tableData[0]);
    table.push(["Table", ...columns]);

    for (let row = 0; row < tableData.length; row ++)
      table.push([
        row.toString(), ...Object.values(tableData[row])
          .map(val =>val !== null ? val.toString() : "")
      ]);

    let data: string = "";

    for (let row = 0; row < table.length; row ++)
      data += `<tr>${table[row].map(el => `<td>${el}</td>`).join("")}</tr>`;

    return `<table><tbody>${data}</tbody></table>`;
  }

  @Post("table/create")
  public createTable (
    @Body('tableName') tableName: string,
    @Body('columns') columns: Column[]
  ): string {
    return `New table created: ${this.dataService.createTable(tableName, columns)}`;
  }

  @Post("table/alter")
  public alterTable (
    @Body('tableId') tableId: number,
    @Body('columns') columns: Column[],
    @Body('type') type: "add" | "drop"
  ): string {
    this.dataService.addOrDropColumns(tableId, columns, type === "add");
    return "done";
  }

  @Post("table/append")
  public insertIntoTable (
    @Body('tableId') tableId: number,
    @Body('columns') columns: Column[],
    @Body('rows') rows: Row[]
  ): void {
    this.dataService.addRows(tableId, columns, rows);
  }

  @Post("view/create")
  public createView (
    @Body('tableId') tableId: number,
    @Body('name') name: string,
    @Body('columnNames') columnNames: string[],
    @Body('rowIndices') rowIndices: number[]
  ) {
    this.dataService.createView(tableId, name, columnNames, rowIndices);
  }
}
