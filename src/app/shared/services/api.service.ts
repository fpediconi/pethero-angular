import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  base = environment.apiBaseUrl;

  get<T>(path: string, params?: any){ return this.http.get<T>(`${this.base}${path}`, { params }); }
  post<T>(path: string, body: any){ return this.http.post<T>(`${this.base}${path}`, body); }
  put<T>(path: string, body: any){ return this.http.put<T>(`${this.base}${path}`, body); }
  delete<T>(path: string){ return this.http.delete<T>(`${this.base}${path}`); }
}