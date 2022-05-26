import { Module } from '@nestjs/common';
import { DataHttpModule } from './workspaceData/data-http.module';

@Module({
  imports: [DataHttpModule, DataHttpModule],
})
export class AppModule {}
