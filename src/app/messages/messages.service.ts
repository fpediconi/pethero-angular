import { Injectable, inject } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { Message } from '../shared/models/message';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private api = inject(ApiService);
  list(threadId: string){ return this.api.get<Message[]>('/messages', { threadId }); }
  send(msg: Partial<Message>){ return this.api.post<Message>('/messages', msg); }
}