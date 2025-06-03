import {
  DestroyRef,
  inject,
  Injectable,
  OnDestroy,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  UserCredential,
} from '@angular/fire/auth';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();
  userInfo = signal<User | null>(null); //lo utilizo en el guard

  private authSub!: Subscription;

  constructor() {
    this.authSub= authState(this.auth).subscribe((user) => {                                                                                // authState() devuelve observable que emite el usuario actual
    this.userSubject.next(user);
      this.userInfo.set(user);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    });
  }

  getUserInfo() {
    return this.userInfo();
  }

  async loginGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const result: UserCredential = await signInWithPopup(this.auth, provider);
      const user = result.user;
      console.log('Usuario logueado:', user);
      await this.router.navigate(['/chat']);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async logOut(): Promise<void> {
    const confirmation = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (!confirmation) return;
    try {
      await signOut(this.auth);
      await this.router.navigate(['/home-login']);
    } catch (error) {
      throw error;
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}
