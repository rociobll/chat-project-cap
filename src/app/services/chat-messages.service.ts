import { inject, Injectable, signal } from '@angular/core';
import {
  Database,
  onValue,
  push,
  query,
  ref,
  orderByChild,
  set,
  limitToLast,
} from '@angular/fire/database';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';
import { Message } from '../interfaces/message.interface';
import { Geolocation } from '@capacitor/geolocation';
import { GeolocationService } from './geolocation.service';

@Injectable({
  providedIn: 'root',
})
export class ChatMessagesService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);
  private geoService = inject(GeolocationService);

  private messagesArray = signal<Message[]>([]);
  limitPage = 10;
  currentLimit = signal<number>(10);
  totalMessages = signal<number>(0);
  isLoading = signal<boolean>(false);
  private userLocation = signal<string>('');

  constructor() {}

  private async setLocation() {
    try {
      const permissionStatus = await Geolocation.checkPermissions();
      if (permissionStatus.location === 'denied') {
        await Geolocation.requestPermissions(); //
      }

      const locationName = await this.geoService.getLocationName();
      this.userLocation.set(locationName);
      console.log('Ubicación inicial:', locationName);
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      this.userLocation.set('Ubicación no disponible');
    }
  }

  async requestLocationPermission(): Promise<void> {
    await this.setLocation();
  }

  //obtener número de mensajes que hay en bbdd realtime
  async updateTotalMessages(): Promise<number> {
    return new Promise((resolve) => {
      const totalCountRef = query(
        ref(this.db, 'nscmessages'),
        orderByChild('timestamp'),
      );

      onValue(
        totalCountRef,
        (totalSnapshot) => {
          const totalInDB = totalSnapshot.size;
          this.totalMessages.set(totalInDB);
          console.log('Total mensajes en DB:', totalInDB);
          resolve(totalInDB);
        },
        { onlyOnce: true },
      );
    });
  }

  async loadMessages() {
    console.log('cargando mensajes con currentlimit:', this.currentLimit());
    this.isLoading.set(true);

    try {
      // obtener numero mensajes actuales en bbdd
      await this.updateTotalMessages();

      const messagesQuery = query(
        ref(this.db, 'nscmessages'),
        orderByChild('timestamp'),
        limitToLast(this.currentLimit()),
      );

      console.log('Query creada esperando datos');

      onValue(messagesQuery, (snapshot) => {
        const allMessages: Message[] = [];

        snapshot.forEach((snapChild) => {
          const data = snapChild.val();
          allMessages.push({ ...data, msgId: snapChild.key });
        });

        allMessages.sort((a, b) => a.timestamp - b.timestamp);
        this.messagesArray.set(allMessages);

        this.isLoading.set(false); // mrcar no cargando después de obtener mensajes
      });
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      this.isLoading.set(false);
    }
  }

  // método para cargar más mensajes
  async loadMoreMessages(): Promise<boolean> {
    console.log('loadMoreMessages llamado');
    if (this.isLoading()) {
      return false;
    }

    try {
      this.isLoading.set(true);
      const oldLimit = this.currentLimit();
      const newLimit = oldLimit + this.limitPage;

      console.log('Limites:', { old: oldLimit, new: newLimit });
      this.currentLimit.set(newLimit);

      // Esperar 1,5s antes de cargar los mensajes asi spinner se muestra más tiempo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await this.loadMessages();

      // comprobar si hay más mensajes para cargar
      const hasMore = this.totalMessages() > newLimit;
      console.log(`¿Hay más mensajes? ${hasMore}`);
      return hasMore;
    } catch (error) {
      console.error('Error al cargar más mensajes', error);

      return false;
    }
  }

  async createMessage(text: string) {
    try {
      const user = await firstValueFrom(this.authService.user$);
      if (!user || !text) return false;

      const location = this.userLocation();
      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });

      const formattedTime = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      //mandar mensaje a firebase al nodo nscmessages- el id lo debe generar el push
      const messagesRef = ref(this.db, 'nscmessages');
      const newMsgRef = push(messagesRef); // crear la ref para poner de id de mensaje
      const messageId = newMsgRef.key; // Crear un ID único para el mensaje

      const newMsg: Message = {
        userId: user.uid,
        msgId: messageId,
        username: user.displayName || 'desconocido',
        date: formattedDate,
        hour: formattedTime,
        timestamp: now.getTime(),
        message: text,
        avatar: user.photoURL!,
        location: location,
      };
      // guardar mensaje en Firebase
      await set(newMsgRef, newMsg);
      // Actualizar nºtotal de mensajes
      await this.updateTotalMessages();

      // verificar si hay más mensajes
      const hasMore = this.totalMessages() > this.currentLimit();
      console.log('Message enviado, nuevo total:', {
        total: this.totalMessages(),
        currentLimit: this.currentLimit(),
        hasMore,
      });

      return true;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return false;
    }
  }

  // método público para acceder a userLocation-está declarada como private
  getUserLocation() {
    return this.userLocation;
  }

  async deleteAllMessages(): Promise<void> {
    try {
      const messagesRef = ref(this.db, 'nscmessages/'); // ref a ubicación de los mensajes en Firebase
      await set(messagesRef, null); // eliminar todos mens
      this.messagesArray.set([]); //vaciar array de mensajes del servicio
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  }

  //método para obtener mensajes
  getMessages() {
    return this.messagesArray;
  }
}
