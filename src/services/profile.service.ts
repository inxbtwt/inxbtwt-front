import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { ProfileSearchPage, ProfileView } from '../components/dto/profile/profile-search';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  search(query: string, page = 0) {
    return this.http
      .get<ApiResponse<ProfileSearchPage>>('/api/profiles', {
        params: { query, page, size: 10 },
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  getByUsername(username: string) {
    return this.http
      .get<ApiResponse<ProfileView>>(`/api/profiles/username/${encodeURIComponent(username)}`, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  downloadPhoto(userId: string, url: string) {
    return this.http.get(`/api/users/${encodeURIComponent(userId)}/photo`, {
      params: { url },
      responseType: 'blob',
      withCredentials: true,
    });
  }
}
