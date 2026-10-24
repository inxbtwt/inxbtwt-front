import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { FriendAction, Friendship } from '../dto/friendship/friendship';
import { FriendshipService } from '../../services/friendship.service';

@Component({
  selector: 'app-friendship-actions',
  template: `
    @if (loading()) {
      <p role="status">Carregando amizade…</p>
    } @else if (relationship(); as relation) {
      <div class="actions" [attr.aria-busy]="busy()">
        @switch (relation.state) {
          @case ('NONE') {
            <button type="button" class="primary" (click)="act('request')" [disabled]="busy()">
              {{ busy() ? 'Enviando…' : 'Adicionar amigo' }}
            </button>
          }
          @case ('REQUEST_SENT') {
            <span>Solicitação enviada</span
            ><button type="button" (click)="act('cancel')" [disabled]="busy()">
              Cancelar solicitação
            </button>
          }
          @case ('REQUEST_RECEIVED') {
            <span>Solicitação recebida</span
            ><button type="button" class="primary" (click)="act('accept')" [disabled]="busy()">
              Aceitar</button
            ><button type="button" (click)="act('decline')" [disabled]="busy()">Recusar</button>
          }
          @case ('FRIENDS') {
            <strong>✓ Amigos</strong>
            @if (!confirming()) {
              <button type="button" (click)="confirming.set(true)" [disabled]="busy()">
                Desfazer amizade
              </button>
            } @else {
              <span>Desfazer esta amizade?</span
              ><button type="button" (click)="confirming.set(false)" [disabled]="busy()">
                Cancelar</button
              ><button type="button" class="danger" (click)="act('remove')" [disabled]="busy()">
                Confirmar
              </button>
            }
          }
        }
      </div>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      <button type="button" (click)="load()" [disabled]="loading() || busy()">
        {{ relationship() ? 'Atualizar estado' : 'Tentar novamente' }}
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
      margin: 14px 0;
      font-family: Arial, sans-serif;
    }
    .actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    span,
    strong,
    p {
      font-size: 12px;
      line-height: 1.5;
    }
    span {
      color: #74746d;
    }
    strong {
      color: #567100;
    }
    button {
      border: 1px solid #111;
      border-radius: 7px;
      padding: 8px 12px;
      background: #fffefa;
      font:
        12px Arial,
        sans-serif;
      cursor: pointer;
    }
    button.primary {
      background: #d4ff3f;
      font-weight: bold;
    }
    button.danger {
      background: #9c3340;
      color: white;
      border-color: #9c3340;
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    button:focus-visible {
      outline: 3px solid #9bc300;
      outline-offset: 3px;
    }
    .error {
      color: #9c3340;
    }
  `,
})
export class FriendshipActions {
  readonly userId = input.required<string>();
  readonly initial = input<Friendship | null>(null);
  private readonly friends = inject(FriendshipService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly relationship = signal<Friendship | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirming = signal(false);
  private request?: Subscription;

  constructor() {
    effect((onCleanup) => {
      this.userId();
      const initial = this.initial();
      this.error.set('');
      this.confirming.set(false);
      this.relationship.set(initial);
      if (!initial) untracked(() => this.load());
      onCleanup(() => this.request?.unsubscribe());
    });
    this.friends.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((relationship) => {
      if (relationship.user.userId === this.userId()) this.relationship.set(relationship);
    });
  }

  protected load(): void {
    if (this.busy()) return;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.friends
      .getState(this.userId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (relationship) => this.relationship.set(relationship),
        error: () => this.error.set('Não foi possível consultar a amizade. Tente novamente.'),
      });
  }

  protected act(action: FriendAction): void {
    if (this.busy() || this.loading()) return;
    this.busy.set(true);
    this.error.set('');
    this.friends
      .act(this.userId(), action)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.confirming.set(false),
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.error?.message || 'Não foi possível atualizar a amizade. Tente novamente.',
          ),
      });
  }
}
