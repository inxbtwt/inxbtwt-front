import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

export function parseTenorId(value: string): string | null {
  if (value.length > 5000) return null;
  const embed = value.includes('tenor-gif-embed')
    ? /data-postid\s*=\s*["']([0-9]{1,20})["']/i.exec(value)
    : null;
  if (embed) return embed[1];
  const link =
    /^https:\/\/tenor\.com\/(?:embed\/([0-9]{1,20})|view\/[A-Za-z0-9_%~.-]+-([0-9]{1,20}))\/?$/i.exec(
      value.trim(),
    );
  return link ? (link[1] ?? link[2]) : null;
}

@Component({
  selector: 'app-tenor-gif',
  template: `
    @if (source(); as url) {
      <iframe
        [src]="url"
        title="GIF do Tenor"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
      <a [href]="'https://tenor.com/view/' + tenorId()" target="_blank" rel="noopener noreferrer"
        >Ver no Tenor ↗</a
      >
    }
  `,
  styles: `
    :host {
      display: grid;
      min-width: 0;
      width: 100%;
      gap: 6px;
    }
    iframe {
      width: 100%;
      aspect-ratio: 1;
      max-height: 520px;
      border: 0;
      border-radius: 8px;
      background: #f4f0e7;
    }
    a {
      justify-self: start;
      color: #74746d;
      font:
        11px Arial,
        sans-serif;
      padding: 4px;
    }
  `,
})
export class TenorGif {
  readonly tenorId = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  // A URL nasce de um ID numérico validado e de um host fixo, nunca do HTML colado.
  protected readonly source = computed(() => {
    const id = this.tenorId();
    return /^[0-9]{1,20}$/.test(id)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://tenor.com/embed/${id}`)
      : null;
  });
}
