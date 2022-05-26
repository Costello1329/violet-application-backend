import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataModule } from './data.module';
import { DataService } from './data.service';

@Module({
  imports: [DataModule],
  providers: [DataService],
  controllers: [DataController]
})
export class DataHttpModule {}
