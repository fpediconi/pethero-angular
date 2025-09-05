import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Profile } from '../../core/models/profile.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private api = environment.apiBaseUrl;

  create(profile: Omit<Profile, 'id'>) {
    return this.http.post<Profile>(`${this.api}/profiles`, profile);
  }

  getByUserId(userId: number) {
    return this.http.get<Profile[]>(`${this.api}/profiles?userId=${userId}`);
  }

  update(profile: Profile) {
    if (!profile.id) throw new Error('Profile id required');
    return this.http.put<Profile>(`${this.api}/profiles/${profile.id}`, profile);
  }
}
