import { Module } from '@nestjs/common';
import { DataModule } from './workspaceData/data.module';

@Module({
  imports: [DataModule],
})
export class AppModule {}
