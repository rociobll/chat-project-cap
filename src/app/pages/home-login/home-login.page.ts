import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonImg,
  IonText,
  IonCard,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-login',
  templateUrl: './home-login.page.html',
  styleUrls: ['./home-login.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    AsyncPipe,
    IonContent,
    IonText,
    CommonModule,
    IonButton,
    IonAvatar,
    IonImg,
    IonIcon,
    IonFooter,
  ],
})
export class HomeLoginPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private router = inject(Router);

  user$ = this.auth.user$;

  private userSub!: Subscription;

  ngOnInit() {
    this.userSub = this.user$.subscribe((user) => {
      if (user) {
        this.router.navigate(['/chat']);
      }
    });
  }

  login() {
    this.auth.loginGoogle();
  }

  logOut() {
    this.auth.logOut();
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  // Método para arreglar error carga de imagen de avatar
  handleImageError(event: any) {
    const imgElement = event.target;
    imgElement.src = '../../../assets/icon/woman2-avatar.png';
  }
}
