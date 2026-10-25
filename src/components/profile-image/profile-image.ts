import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-image',
  template: `
    @if (source()) {
      <img
        [src]="source()"
        [alt]="name()"
        (error)="source.set('')"
        class="block size-full"
        [style.object-fit]="fit()"
      />
    } @else {
      <span
        class="grid size-full place-items-center bg-[#d4ff3f] font-bold"
        [attr.aria-label]="name()"
        >{{ initials() }}</span
      >
    }
  `,
  styles:
    ':host { display: block; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }',
})
export class ProfileImage {
  private readonly profiles = inject(ProfileService);
  readonly userId = input('');
  readonly username = input('');
  readonly imageUrl = input<string | null>(null);
  readonly name = input('');
  readonly fit = input<'cover' | 'contain'>('cover');
  protected readonly source = signal('');
  protected readonly initials = computed(() =>
    this.name()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
      .join(''),
  );

  constructor() {
    effect((onCleanup) => {
      const userId = this.userId();
      const username = this.username();
      const url = this.imageUrl();
      this.source.set('');
      if (!url || (!userId && !username)) return;
      let objectUrl = '';
      const photo = userId
        ? this.profiles.downloadPhoto(userId, url)
        : this.profiles
            .getByUsername(username)
            .pipe(switchMap((profile) => this.profiles.downloadPhoto(profile.userId, url)));
      const request = photo.subscribe({
        next: (photo) => {
          objectUrl = URL.createObjectURL(photo);
          this.source.set(objectUrl);
        },
        error: () => this.source.set(''),
      });
      onCleanup(() => {
        request.unsubscribe();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
    });
  }
}
