import naive from 'naive-ui'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
app.use(naive)
app.mount('#app')
