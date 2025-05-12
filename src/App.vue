<script setup>
import { onMounted, reactive } from 'vue';
import { useLocalStorage } from './composables/useLocalStorage';

const { value: VAPID_PUBLIC_KEY } = useLocalStorage('VAPID_PUBLIC_KEY');

const { value: userId } = useLocalStorage('userId')

const { value: token } = useLocalStorage('token')

const { value: loginData } = reactive(
  useLocalStorage('loginData', {
    email: '',
    password: ''
  })
)

/** @type {ServiceWorkerRegistration[]} */
const serviceWorkers = reactive([])

function base64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const base64Url = (base64 + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64Url);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function handleLogin() {
  fetch(`http://localhost:3000/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData),
    headers: { 
      'Content-Type': 'application/json',
     }
  })
    .then((res) => res.json())
    .then((res) => {
      token.value = res.token
      userId.value = res.user.id

      loginData.value = res.user
    });
}

async function handleRegistration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push not supported in this browser.');
    return;
  }
  
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Permission denied');
    return;
  } 
  
  navigator.serviceWorker.register('sw.js').then(async (reg) => {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY.value)
    });
  
    await fetch(`http://localhost:3000/api/subscriber/${userId.value}`, {
      method: 'POST',
      body: JSON.stringify(sub),
      headers: { 
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token.value}`
        }
    });
  
    handleUpdateRegistrations()
  });
}

function handleGetRegistrations() {
  return navigator.serviceWorker.getRegistrations()
}

/** @param {ServiceWorkerRegistration} sw */
async function handleUnregistration(sw) {
  await Promise.all([
    sw.unregister(),
    handleUpdateRegistrations()
  ])

  await fetch(`http://localhost:3000/api/subscriber/${userId.value}`, {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      'authorization': `Bearer ${token.value}`
     }
  });
}

function handleUpdateRegistrations() {
  serviceWorkers.length = 0
  handleGetRegistrations().then((regs) => serviceWorkers.push(...regs))
}

async function handleNotificationTest() {
  await fetch(`http://localhost:3000/api/subscriber/test/${userId.value}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'authorization': `Bearer ${token.value}`
     }
  });
}

onMounted(handleUpdateRegistrations)

</script>

<template>
  <main class="w-screen h-screen bg-slate-500 overflow-x-hidden flex items-center justify-center gap-4">

    <fieldset class="bg-sky-500 min-w-[400px] h-72 rounded-xl flex flex-col justify-between overflow-x-hidden">
      <legend class="text-center font-bold bg-sky-600 px-4 rounded-xl">
        Auth
      </legend>
      
      <div class="flex flex-col">
        <label for="VAPID_PUBLIC_KEY">
          VAPID PUBLIC KEY:
        </label>
        <input v-model="VAPID_PUBLIC_KEY" class="truncate" id="VAPID_PUBLIC_KEY" />
        
        <div class="flex flex-col gap-2">
          <label for="email">Email</label>
          <input v-model="loginData.email" class="truncate" id="email" />
          <label for="password">Password</label>
          <input v-model="loginData.password" class="truncate" id="password" />
        </div>

        <label>
          token: (Readonly)
        </label>
        <input :value="token" class="truncate" readonly />
      </div>

      <input class="p-4 bg-sky-600 rounded-xl cursor-pointer m-2" type="button" value="Login" @click="handleLogin" />
    </fieldset>
    
    <fieldset class="bg-violet-500 min-w-lg h-64 rounded-xl flex flex-col justify-between overflow-x-hidden">
      <legend class="text-center font-bold bg-violet-600 px-4 rounded-xl">
        Identification
      </legend>
  
      <div class="flex flex-col">
        <label for="userId">userId</label>
        <input v-model="userId" id="userId" />
      </div>

      <button class="p-4 bg-violet-600 rounded-xl cursor-pointer m-2" @click="handleNotificationTest">
        Test Notification
      </button>
  
    </fieldset>

    <fieldset class="bg-amber-500 min-w-lg h-64 rounded-xl flex flex-col justify-between overflow-x-hidden">
      <legend class="text-center font-bold bg-amber-600 px-4 rounded-xl">
        Service Workers
      </legend>
      
      <input 
        type="button" 
        class="cursor-pointer p-4 bg-amber-600 rounded-xl m-2" 
        @click="handleRegistration" 
        value="Activate Notifications" 
      />

      Actually has {{ serviceWorkers.length }} active!
    
      <div class="flex flex-col overflow-y-auto max-w-md">
        <div v-for="(sw, index) in serviceWorkers" :key="index">
          {{ index + 1 }}. {{ sw.active?.state }}
          <button class="p-4 bg-amber-600 rounded-xl m-2" @click="handleUnregistration(sw)">
            UNREGISTER
          </button>
        </div>
      </div>
    </fieldset>
    
  </main>
</template>