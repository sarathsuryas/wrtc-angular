import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { SocketService } from '../socket-service.service';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-broadcaster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './broadcaster.component.html',
  styleUrl: './broadcaster.component.css'
})
export class BroadcasterComponent {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  
  socket: Socket;
  localStream: MediaStream | undefined;
  peerConnection: RTCPeerConnection | undefined;
  isBroadcasting = false;
  
  statusMessage = 'Status: Not Broadcasting';
  statusClass = 'offline';
  
  startButtonDisabled = false;
  broadcastButtonDisabled = true;
  stopButtonDisabled = true;

  constructor() {
    this.socket = io('https://open-relay-sfu.onrender.com');
  }

  ngOnInit() {
    // Socket.io event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('broadcaster_exists', () => {
      this.updateStatus('Another broadcaster is already active. Please try again later.', 'offline');
      this.stopBroadcasting();
    });
    
    this.socket.on('broadcaster_answer', (description) => {
      if (this.peerConnection) {
        this.peerConnection.setRemoteDescription(description)
          .catch(error => {
            console.error('Error setting remote description:', error);
          });
      }
    });
    
    this.socket.on('broadcaster_ice_candidate', (candidate) => {
      if (this.peerConnection) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => {
            console.error('Error adding ICE candidate:', error);
          });
      }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupResources();
    });
  }

  ngOnDestroy() {
    this.cleanupResources();
  }

  cleanupResources() {
    if (this.isBroadcasting) {
      this.socket.emit('disconnect');
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }

  async startCamera() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      this.localVideo.nativeElement.srcObject = this.localStream;
      this.startButtonDisabled = true;
      this.broadcastButtonDisabled = false;
      
      this.updateStatus('Camera ready. Click "Start Broadcasting" to begin.', 'waiting');
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      this.updateStatus(`Error accessing camera/microphone: ${error.message}`, 'offline');
    }
  }

  startBroadcasting() {
    if (!this.localStream) {
      this.updateStatus('Please start your camera first', 'offline');
      return;
    }
    
    this.socket.emit('broadcaster');
    this.setupPeerConnection();
    this.broadcastButtonDisabled = true;
    this.stopButtonDisabled = false;
    this.isBroadcasting = true;
  }

  setupPeerConnection() {
    const configuration = {
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
      ],
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);
    
    // Add all tracks from local stream to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }
    
    // ICE candidate handling
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('broadcaster_ice_candidate', event.candidate);
        }
      };
      
      // Create offer
      this.peerConnection.createOffer()
        .then(offer => {
          if (this.peerConnection) {
            return this.peerConnection.setLocalDescription(offer);
          }
          return Promise.reject('Peer connection not available');
        })
        .then(() => {
          if (this.peerConnection && this.peerConnection.localDescription) {
            this.socket.emit('broadcaster_offer', this.peerConnection.localDescription);
            this.updateStatus('Broadcasting started. Waiting for viewers...', 'online');
          }
        })
        .catch(error => {
          console.error('Error creating offer:', error);
          this.updateStatus(`Error starting broadcast: ${error.message}`, 'offline');
        });
    }
  }

  stopBroadcasting() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = undefined;
    }
    
    this.isBroadcasting = false;
    this.broadcastButtonDisabled = false;
    this.stopButtonDisabled = true;
    this.updateStatus('Broadcasting stopped', 'offline');
  }

  updateStatus(message: string, className: string) {
    this.statusMessage = `Status: ${message}`;
    this.statusClass = className;
  }
}
