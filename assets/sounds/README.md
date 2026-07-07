# assets/sounds — 효과음(SFX)

기본 효과음은 코드에서 **Web Audio 로 합성**됩니다(무료·무설치·저용량). 별도 음원 파일이 없어도 소리가 납니다.

## 실제 음원으로 교체하기

무료(예: CC0) 효과음 파일을 이 폴더에 넣고, `config.js` 의 `sfx.files` 에 경로를 연결하면
합성음 대신 해당 파일이 재생됩니다.

```js
// config.js
sfx: {
  enabled: true,
  volume: 0.35,
  files: {
    click:    'assets/sounds/click.mp3',
    scene:    'assets/sounds/scene.mp3',
    pop:      'assets/sounds/pop.mp3',      // 계면이 등장
    splash:   'assets/sounds/splash.mp3',   // 계면이 맞을 때
    water:    'assets/sounds/water.mp3',     // 샤워 물줄기
    drip:     'assets/sounds/drip.mp3',      // 물방울
    success:  'assets/sounds/success.mp3',
    warn:     'assets/sounds/warn.mp3',      // 실패/경고
    complete: 'assets/sounds/complete.mp3',  // 완료
  },
}
```

## 사운드 이름 → 사용 위치

| 이름 | 재생 시점 |
|---|---|
| `click` | 버튼 클릭(모든 버튼) |
| `scene` | Scene 시작 |
| `pop` | 계면이 등장 |
| `splash` | 계면이 씻김(맞을 때) |
| `water` | 샤워(헹굼) 장면 시작 |
| `drip` | 물방울 |
| `success` | 미션 성공 |
| `warn` | 경고/실패 |
| `complete` | 최종 완료 |

> 볼륨은 `config.sfx.volume`(0~1) 에서 조정. 전체 끄기는 `config.sfx.enabled: false`.
