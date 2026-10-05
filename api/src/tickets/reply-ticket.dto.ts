import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReplyTicketDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  sourceLanguage?: string;
}
