import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { PostMedia as Attachment } from '../dto/post/post';
import { TenorGif } from '../tenor-gif/tenor-gif';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-media',
  imports: [TenorGif],
  template: `
    @if (attachment().provider === 'TENOR') {
      <app-tenor-gif [tenorId]="attachment().externalId ?? ''" />
    } @else {
      @if (source()) {
        <img
          [src]="source()"
          [alt]="
            attachment().contentType === 'image/gif' ? 'GIF da publicação' : 'Imagem da publicação'
          "
          (error)="failed.set(true)"
        />
      }
      @if (failed()) {
        <p role="status">Não foi possível carregar a imagem.</p>
        <button type="button" (click)="retry.update(increment)">Tentar novamente</button>
      } @else if (!source()) {
        <p role="status">Carregando imagem…</p>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      min-width: 0;
      align-content: center;
      background: #f4f0e7;
      border-radius: 8px;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      max-height: 520px;
      object-fit: contain;
    }
    p {
      padding: 12px;
      font-size: 12px;
      color: #74746d;
      text-align: center;
    }
    button {
      justify-self: center;
      margin: 0 12px 12px;
      padding: 8px;
      cursor: pointer;
    }
  `,
})
export class PostMedia {
  readonly postId = input.required<string>();
  readonly attachment = input.required<Attachment>();
  private readonly mediaId = computed(() =>
    this.attachment().provider === 'TENOR' ? null : this.attachment().mediaId,
  );
  private readonly publications = inject(PostService);
  protected readonly source = signal('');
  protected readonly failed = signal(false);
  protected readonly retry = signal(0);
  protected readonly increment = (value: number) => value + 1;

  constructor() {
    effect((onCleanup) => {
      const postId = this.postId();
      const mediaId = this.mediaId();
      this.retry();
      this.source.set('');
      this.failed.set(false);
      if (!mediaId) return;
      let objectUrl = '';
      const request = this.publications.downloadMedia(postId, mediaId).subscribe({
        next: (blob) => {
          objectUrl = URL.createObjectURL(blob);
          this.source.set(objectUrl);
        },
        error: () => this.failed.set(true),
      });
      onCleanup(() => {
        request.unsubscribe();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
    });
  }
}
