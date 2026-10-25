import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../environments/environment';

export const apiUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (!/^\/api(?:\/|\?|$)/.test(request.url)) return next(request);

  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  return next(request.clone({ url: apiUrl + request.url.slice('/api'.length) }));
};
