import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonImg,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    RouterLink,
    IonIcon,
    IonLabel,
    IonImg,
    IonAvatar,
    IonHeader,
    IonTitle,
    IonButton,
    IonButtons,
    IonToolbar,
    UpperCasePipe,
    AsyncPipe,
  ],
})
export class HeaderComponent implements OnInit {
  ngOnInit() {}

  private readonly auth = inject(AuthService);

  appName = signal('NonStopChat');
  user$ = this.auth.user$;

  login() {
    this.auth.loginGoogle();
  }

  logOut() {
    this.auth.logOut();
  }






  handleImageError(event: any) {
    const imgElement = event.target;
    imgElement.src = '../../../assets/icon/woman2-avatar.png';
  }
}
