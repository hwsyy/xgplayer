import Proxy from './proxy'
import util from './utils/util'
import sniffer from './utils/sniffer'
import Errors from './error'
import {version} from '../package.json'
class Player extends Proxy {
  constructor (options) {
    super(options)
    this.config = util.deepCopy({
      width: 600,
      height: 337.5,
      ignores: [],
      whitelist: [],
      lang: (document.documentElement.getAttribute('lang') || navigator.language || 'zh-cn').toLocaleLowerCase(),
      inactive: 3000,
      volume: 0.6,
      controls: true,
      controlsList: ['nodownload']
    }, options)
    this.version = version
    this.userTimer = null
    this.waitTimer = null
    this.history = []
    this.root = util.findDom(document, `#${this.config.id}`)
    this.controls = util.createDom('xg-controls', '', {unselectable: 'on', onselectstart: 'return false'}, 'xgplayer-controls')
    if (!this.root) {
      let el = this.config.el
      if (el && el.nodeType === 1) {
        this.root = el
      } else {
        this.emit('error', new Errors('use', this.config.vid, {
          line: 32,
          handle: 'Constructor',
          msg: 'container id can\'t be empty'
        }))
        return false
      }
    }

    util.addClass(this.root, `xgplayer xgplayer-${sniffer.device} xgplayer-nostart ${this.config.controls ? '' : 'no-controls'}`)
    this.root.appendChild(this.controls)
    this.root.style.width = `${this.config.width}px`
    this.root.style.height = `${this.config.height}px`
    if (Player.plugins) {
      let ignores = this.config.ignores
      Object.keys(Player.plugins).forEach(name => {
        let descriptor = Player.plugins[name]
        if (!ignores.some(item => name === item)) {
          if (['pc', 'tablet', 'mobile'].some(type => type === name)) {
            if (name === sniffer.device) {
              descriptor.call(this, this)
            }
          } else {
            descriptor.call(this, this)
          }
        }
      })
    }
    this.ev.forEach((item) => {
      let evName = Object.keys(item)[0]; let evFunc = this[item[evName]]
      if (evFunc) {
        this.on(evName, evFunc)
      }
    });

    ['focus', 'blur'].forEach(item => {
      this.on(item, this['on' + item.charAt(0).toUpperCase() + item.slice(1)])
    })
    setTimeout(() => {
      this.emit('ready')
    }, 0)
    if (options.autoplay) {
      this.start()
    }
  }

  start (url = this.config.url) {
    let root = this.root; let player = this
    if (util.typeOf(url) === 'String') {
      this.video.src = url
    } else {
      url.forEach(item => {
        this.video.appendChild(util.createDom('source', '', {src: `${item.src}`, type: `${item.type || ''}`}))
      })
    }
    root.insertBefore(this.video, root.firstChild)
    player.userTimer = setTimeout(function () {
      player.emit('blur')
    }, player.config.inactive)
    setTimeout(() => {
      this.emit('complete')
    }, 1)
  }

  reload () {
    this.video.load()
    this.once('loadeddata', function () {
      this.play()
    })
  }

  destroy () {
    if (!this.paused) {
      this.pause()
      this.once('pause', () => {
        this.emit('destroy')
        this.root.parentNode.removeChild(this.root)
      })
    } else {
      this.emit('destroy')
      this.root.parentNode.removeChild(this.root)
    }
  }

  replay () {
    let _replay = this._replay
    // ie9 bugfix
    util.removeClass(this.root, 'xgplayer-ended')
    if (_replay && _replay instanceof Function) {
      _replay()
    } else {
      this.currentTime = 0
      this.play()
    }
  }

  onFocus () {
    let player = this
    util.removeClass(this.root, 'xgplayer-inactive')
    if (player.userTimer) {
      clearTimeout(player.userTimer)
    }
    player.userTimer = setTimeout(function () {
      player.emit('blur')
    }, player.config.inactive)
  }

  onBlur () {
    if (!this.paused && !this.ended) {
      util.addClass(this.root, 'xgplayer-inactive')
    }
  }

  onPlay () {
    util.addClass(this.root, 'xgplayer-playing')
    util.removeClass(this.root, 'xgplayer-pause')
  }

  onPause () {
    util.addClass(this.root, 'xgplayer-pause')
    if (this.userTimer) {
      clearTimeout(this.userTimer)
    }
    this.emit('focus')
  }

  onEnded () {
    util.addClass(this.root, 'xgplayer-ended')
    util.removeClass(this.root, 'xgplayer-playing')
  }

  onSeeking () {
    // util.addClass(this.root, 'seeking');
  }

  onSeeked () {
    // for ie,playing fired before waiting
    if (this.waitTimer) {
      clearTimeout(this.waitTimer)
    }
    util.removeClass(this.root, 'xgplayer-isloading')
  }

  onWaiting () {
    let self = this
    if (self.waitTimer) {
      clearTimeout(self.waitTimer)
    }
    self.waitTimer = setTimeout(function () {
      util.addClass(self.root, 'xgplayer-isloading')
    }, 500)
  }

  onPlaying () {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer)
    }
    util.removeClass(this.root, 'xgplayer-isloading xgplayer-nostart xgplayer-pause xgplayer-ended xgplayer-is-error xgplayer-replay')
    util.addClass(this.root, 'xgplayer-playing')
  }

  static install (name, descriptor) {
    if (!Player.plugins) {
      Player.plugins = {}
    }
    Player.plugins[name] = descriptor
  }
}

Player.util = util
Player.sniffer = sniffer
Player.Errors = Errors

export default Player
