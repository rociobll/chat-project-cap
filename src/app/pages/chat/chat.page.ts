import { User } from '@angular/fire/auth';
import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  InfiniteScrollCustomEvent,
  IonAvatar,
  IonButton,
  IonCard,
  IonContent,
  IonIcon,
  IonImg,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonText,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';
import { RouterLink } from '@angular/router';
import { ChatMessagesService } from 'src/app/services/chat-messages.service';
import { GeolocationService } from 'src/app/services/geolocation.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonCard,
    IonContent,
    IonText,
    IonButton,
    IonInput,
    IonAvatar,
    IonIcon,
    IonImg,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class ChatPage implements OnInit {
  chatService = inject(ChatMessagesService);
  authService = inject(AuthService);
  locationService = inject(GeolocationService);

  userInfo = this.authService.getUserInfo();
  messageInput = new FormControl('', [Validators.required]);
  messages = this.chatService.getMessages();
  userLocation = signal<string>('');
  allowAutoScroll = true;
  hasMoreMessages = false;
  isLoadingMore = signal<boolean>(false);
  isLoading = this.chatService.isLoading(); //señal desde el servicio

  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  async ngOnInit() {
    if (this.userInfo) {
      try {
        await this.chatService.loadMessages();

        setTimeout(() => {
          this.scrollToBottom();
        }, 100);

        await this.chatService.requestLocationPermission();
        this.userLocation = this.chatService.getUserLocation();

        if (this.infiniteScroll) {
          const hasMore =
            this.chatService.totalMessages() > this.chatService.currentLimit();
          this.infiniteScroll.disabled = !hasMore;
          this.hasMoreMessages = hasMore;
        }
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
      }
    }
  }

  scrollToBottom(): void {
    if (!this.content) return;

    try {
      this.content.scrollToBottom(100);
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  //método para cargar más mensajes - completar el evento de infinite scroll y deshabilitarlo si no hay más mensajes.
  loadMoreMessages(event: InfiniteScrollCustomEvent) {
    if (this.isLoading) {
      event.target.complete();
      return;
    }

    this.isLoadingMore.set(true);

    this.content.getScrollElement().then((el) => {
      const previousHeight = el.scrollHeight;

      this.chatService.loadMoreMessages().then((hasMore) => {
        //then espera q la promesa loadMore se resuelva, evalua hasMore(si es true o false) par saber si mantener scroll-inf o no
        this.hasMoreMessages = hasMore;

        setTimeout(() => {
          if (!hasMore) {
            event.target.disabled = true;
            this.infiniteScroll.disabled = true;
            this.isLoadingMore.set(false);
            event.target.complete();
            return;
          }
          // ajusto scroll para mantener posición relativa
          this.content.getScrollElement().then((newEl) => {
            const newHeight = newEl.scrollHeight;
            const scrollOffset = newHeight - previousHeight;
            newEl.scrollTop += scrollOffset;

            this.isLoadingMore.set(false);
            event.target.complete(); //informa a componente q la carga se ha completado
          });
        }, 100); // lo que tarda en ir a la posición relativa
      });
    });
  }

  async sendMessage() {
    if (this.messageInput.invalid) return;

    const text = this.messageInput.value?.trim();
    if (text) {
      try {
        await this.chatService.createMessage(text);
        this.messageInput.reset();
        this.chatService.currentLimit.set(10); //cuando se envia nuevo mensaje, reiniciamos limite a 10 para que cargue los ultomos10 mensajes denuevo

        await this.chatService.loadMessages(); //volver a cargar mensaje con limit 10

        if (this.infiniteScroll) {
          const hasMore =
            this.chatService.totalMessages() > this.chatService.currentLimit();
          this.infiniteScroll.disabled = !hasMore;
          this.hasMoreMessages = hasMore;
        }
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);

        // }
      } catch (error) {
        console.error('Error enviando mensaje:', error);
      }
    }
  }

  deleteAllMessages() {
    const confirmation = confirm(
      '¿Estás seguro de que quieres eliminar permanentemente todos los mensajes?',
    );
    if (confirmation) {
      this.chatService.deleteAllMessages();
    }
  }

  logOut() {
    this.authService.logOut();
  }

  // Método para arreglar el error de carga de la imagen de avatar desde Google (a veces carga y a veces no)
  handleImageError(event: any) {
    const imgElement = event.target; // event.target obtener ref a elemento HTML q disparó error
    imgElement.src = '../../../assets/icon/woman2-avatar.png'; // cambia la ruta a imagen por defecto
  }
}
