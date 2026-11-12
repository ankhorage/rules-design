const php = Bun.spawn({
  cmd: ['php', 'test/website-recognition-consumer.php'],
  stderr: 'inherit',
  stdout: 'inherit',
});

if ((await php.exited) !== 0) throw new Error('PHP website-recognition consumer failed.');
