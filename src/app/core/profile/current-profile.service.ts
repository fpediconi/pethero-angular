import { Injectable, signal } from '@angular/core';
import { Profile } from '@shared/models';
import { ProfileService } from './profile.service';
/*
############################################
Name: CurrentProfileService
Objetive: Provide current profile domain operations.
Extra info: Wraps API access, caching, and shared business rules.
############################################
*/


@Injectable({ providedIn: 'root' })
export class CurrentProfileService {
  private _profile = signal<Profile | null>(null);
  profile = this._profile;

  constructor(private profiles: ProfileService){}

  loadForUser(userId: number){
    return this.profiles.getByUserId(userId).subscribe(list => {
      this._profile.set(list[0] ?? null);
    });
  }

  setProfile(p: Profile){
    this._profile.set(p);
  }
}


