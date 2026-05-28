<?php
// Генерация трёх случайных чисел от 1 до 100
$a = rand(1, 100);
$b = rand(1, 100);
$c = rand(1, 100);
$sum = $a + $b + $c;
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>сумма | ячейки</title>
    <style>
        /* стили без изменений — возьмите из вашего исходного HTML */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #f4f6fa;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(130px, 160px));
            gap: 1.25rem;
            justify-content: center;
            align-items: center;
        }
        .cell {
            background: #ffffff;
            border-radius: 1.75rem;
            box-shadow: 0 6px 14px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 1.5rem 0.5rem;
            aspect-ratio: 1/1;
        }
        .number {
            font-size: 2.6rem;
            font-weight: 540;
            color: #121826;
            line-height: 1.2;
            margin-bottom: 0.5rem;
            letter-spacing: -0.01em;
        }
        .label {
            font-size: 0.7rem;
            font-weight: 430;
            color: #7e8493;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        @media (max-width: 700px) {
            .grid { grid-template-columns: repeat(2, minmax(125px, 145px)); gap: 1rem; }
            .number { font-size: 2.2rem; }
            .label { font-size: 0.65rem; }
            .cell { padding: 1.2rem 0.3rem; }
        }
        @media (max-width: 480px) {
            .grid { grid-template-columns: repeat(2, minmax(100px, 115px)); gap: 0.9rem; }
            .number { font-size: 1.9rem; }
            .label { font-size: 0.6rem; }
            .cell { padding: 1rem 0.2rem; }
        }
        @media (max-width: 380px) {
            .grid { grid-template-columns: repeat(2, minmax(92px, 105px)); gap: 0.75rem; }
            .number { font-size: 1.7rem; }
        }
    </style>
</head>
<body>
<div class="grid">
    <div class="cell">
        <div class="number"><?= $a ?></div>
        <div class="label">число 1</div>
    </div>
    <div class="cell">
        <div class="number"><?= $b ?></div>
        <div class="label">число 2</div>
    </div>
    <div class="cell">
        <div class="number"><?= $c ?></div>
        <div class="label">число 3</div>
    </div>
    <div class="cell">
        <div class="number"><?= $sum ?></div>
        <div class="label">сумма</div>
    </div>
</div>
</body>
</html>