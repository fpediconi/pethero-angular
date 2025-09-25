import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Profile } from '@shared/models';
import { environment } from '../../../environments/environment';
/*
############################################
Name: ProfileService
Objetive: Provide profile domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


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

