import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';


@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
   }
  broadcaster() {
    this.socket.emit('broadcaster');
  }
  broadcasterIceCandidate(event:RTCPeerConnectionIceEvent) {
     this.socket.emit('broadcaster_ice_candidate', event.candidate);
  }
  broadCastOffer(localDescription:RTCSessionDescription) {
    this.socket.emit('broadcaster_offer', localDescription);
  }
 
  on(event: string): Observable<any> {
    return new Observable((observer) => {
      this.socket.on(event, (data) => {
        observer.next(data);
      });

      // Handle cleanup
      return () => {
        this.socket.off(event);
      };
    });
  }
  
  requestBroadcast() {
    this.socket.emit("viewer_request");
  }
  viewerIceCandidate(candidate:RTCIceCandidate) {
    this.socket.emit("viewer_ice_candidate", candidate);
  }
  viewerAnswer(localDescription:RTCSessionDescription |null ) {
  this.socket.emit("viewer_answer", localDescription);
  }

}
