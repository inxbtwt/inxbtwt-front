import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, of, startWith, Subject, switchMap } from 'rxjs';
import { Post } from '../../components/dto/post/post';
import { PostCard } from '../../components/post-card/post-card';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-page',
  imports: [RouterLink, PostCard, ProfileSearch],
  templateUrl: './post.page.html',
})
export class PostPage {
  private readonly route = inject(ActivatedRoute);
  private readonly publications = inject(PostService);
  protected readonly post = signal<Post | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly retry = new Subject<void>();

  constructor() {
    combineLatest([this.route.paramMap, this.retry.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.post.set(null);
          this.loading.set(true);
          this.error.set('');
          return this.publications.getPost(params.get('postId') ?? '').pipe(
            catchError((error: HttpErrorResponse) => {
              this.error.set(
                error.status === 404
                  ? 'Publicação não encontrada.'
                  : 'Não foi possível carregar a publicação. Tente novamente.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((post) => {
        this.post.set(post);
        this.loading.set(false);
      });
  }
}
