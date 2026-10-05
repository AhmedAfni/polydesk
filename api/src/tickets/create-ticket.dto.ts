import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsEmail()
  customerEmail: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;
}
