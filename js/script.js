const RECORDS_STORAGE_KEY = 'user_records';

jQuery(document).ready(function() {
    const $welcomeScreen = jQuery('.welcome-message'),
          $statsItems = jQuery('.stats__items'),
          $startGameButton = jQuery('.start-game-button'),
          $recordForm = jQuery('.record-form'),
          $showStatsButton = jQuery('.show-stats-button');

    const $gameArea = jQuery('.game-area'),
        $gameStats = jQuery('.game-area__stats'),
        $gameAreaCards = jQuery('.game-area__cards');

    const $game = jQuery('.game'),
          $stats = jQuery('.stats');

    $welcomeScreen.fadeIn(150).css('display', 'flex');

    const stats = {
        init: () => {
            let data = localStorage.getItem(RECORDS_STORAGE_KEY);

            if(data) {
                try {
                    stats.paint(JSON.parse(data));
                } catch(e) {
                    console.error(e);
                    stats.paintNotFound();
                }
            } else {
                stats.paintNotFound();
            }

            stats.bindEvents();
        },
        write: (name, rounds) => {
            let data = localStorage.getItem(RECORDS_STORAGE_KEY);

            try {
                data = JSON.parse(data || '');

                data = [
                    ...data,
                    {
                        name,
                        rounds
                    }
                ];
            } catch(e) {
                data = [
                    {
                        name,
                        rounds
                    }
                ]
            }

            localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(data));
        },
        paint: (records) => {
            $statsItems.html('');

            let prevScore = null,
                position = 1;

            records
                .sort((a, b) => a.rounds - b.rounds)
                .filter((_, i) => i < 10)
                .map((r) => {
                    if(prevScore && r.rounds !== prevScore) {
                        position ++;
                    }

                    prevScore = r.rounds;

                    return {
                        ...r,
                        position
                    };
                })
                .forEach(stats.renderItem);
        },
        renderItem: ({ name, rounds, position }) => {
            const $element = jQuery('<div />');

            $element.addClass('stats__items--item');
            $element.html(`
                <span>${position}.</span>
                <b>${name}</b>
                <small>${rounds}</small>
            `);

            $statsItems.append($element);
        },
        paintNotFound: () => {
            const $element = jQuery('<div />');

            $element.addClass('stats__items--error');
            $element.html("No records were registered. Maybe you wanna try to play some Guatemala Memory Game?");

            $statsItems.find('.stats__items--error').detach();
            $statsItems.append($element);
        },

        bindEvents: () => {
            $recordForm.find('.submit-record').off('click');

            $recordForm.find('#record-name').on('keyup', function(e) {
                if(e.key === 'Enter') {
                    stats.submitRecord();
                }
            });

            $recordForm.find('.submit-record').click(stats.submitRecord);
        },

        submitRecord: () => {
            const $nameField = $recordForm.find('#record-name');
            const userName = $nameField.val();

            if(!userName) {
                alert('Provide your name in user field!');
                return false;
            }

            stats.write(userName, game.rounds);
            stats.init();

            $nameField.val('');
            $recordForm.fadeOut(300);

            $game.hide();
            $stats.fadeIn(300);
        }
    };

    // --- Game ----

    const game = {
        rounds: 0,
        maxPairs: 20,
        maxImages: 10,
        maxOpenedCards: 2,
        maxRounds: 0,
        cards: [],

        start: () => {
            game.rounds = 0;
            game.maxOpenedCards = game.maxPairs/game.maxImages;
            game.maxRounds = game.maxImages;

            game.generateCards();
            game.draw();

            $gameArea.fadeIn(300);
        },
        end: () => {
            $recordForm.find('.record-rounds').html(game.rounds);
            $recordForm.fadeIn(300).css('display', 'flex');
        },
        generateCards: () => {
            const maxImagesPerPair = game.maxPairs/game.maxImages;
            let allCards = new Array(game.maxPairs)
                .fill(null)
                .map((_, i) => ({
                    position: i
                }));

            let imageId = 1;
            let pairId = 1;

            for(let i = 1; i <= game.maxImages; i++) {
                for(let j = 0; j < maxImagesPerPair; j++) {
                    const availablePositions = allCards.filter((c) => !c.id),
                        randomPosition = Math.floor(Math.random() * ((availablePositions.length - 1) + 1));

                    const selectedPosition = availablePositions[randomPosition];

                    allCards[selectedPosition.position] = {
                        id: imageId,
                        pair: pairId,
                        imageNumber: i,
                        position: selectedPosition.position
                    };

                    imageId ++;
                }

                pairId ++;
            }

            game.cards = allCards.sort((a, b) => a.position - b.position);
        },
        draw: () => {
            game.drawStats();
            game.drawPairs();
        },
        drawStats: () => {
            $gameStats.find('.game-area__stats--left').html(`
                <b>Rounds:</b>
                <span>${game.rounds}</span>
            `);

            return true;
        },
        drawPairs: () => {
            $gameAreaCards.html('');
            game.cards.forEach(game.renderPair);
        },
        renderPair: ({ id, imageNumber }) => {
            const $pair = jQuery('<div>');

            $pair.addClass('pair__card--wrapper');
            $pair.html(`
                <div class="pair__card" data-id="${id}">
                    <div class="pair__card--front"></div>
                    <div class="pair__card--back">
                        <img src="./img/memo-${imageNumber.toString().padStart(2, '0')}.jpg" />
                    </div>
                </div>
            `);

            game.bindPairEvent($pair);
            $gameAreaCards.append($pair);
        },
        showCard: ($card) => {
            if($card.hasClass('disabled')) return false;
            if($gameAreaCards.find('.pair__card.active').length === game.maxOpenedCards) return false;

            $card.find('.pair__card').addClass('active');

            game.checkConditions();
        },
        bindPairEvent: ($element) => {
            $element.click(function() {
                game.showCard($element);
            });
        },
        checkConditions: () => {
            const $openedCards = [...$gameAreaCards.find('.pair__card.active')];
            if($openedCards.length !== game.maxOpenedCards) return false;

            game.rounds ++;
            game.drawStats();

            let pairIds = [];

            $openedCards.forEach(($card) => {
                const cardId = parseInt(jQuery($card).attr('data-id')),
                      cardObject = game.cards.find((c) => c.id === cardId);

                if(cardObject) {
                    pairIds.push(cardObject.pair);
                }
            });

            let pairId = pairIds[0];

            if(pairIds.some((id) => id !== pairId)) {
                setTimeout(() => {
                    $openedCards.forEach(($c) => jQuery($c).removeClass('active'));
                }, 600);

                return false;
            }

            $openedCards.forEach(($card) => {
                jQuery($card).addClass('disabled');
                jQuery($card).removeClass('active');
            });

            if($gameAreaCards.find('.pair__card.disabled').length === $gameAreaCards.find('.pair__card').length) {
                game.end();
            }

            return true;
        }
    };

    stats.init();

    // ---- Buttons handlers ----
    $startGameButton.click(function() {
        $game.show();
        $welcomeScreen.hide();
        $stats.hide();

        game.start();
    });

    $showStatsButton.click(function() {
        stats.init();

        $game.hide();
        $welcomeScreen.hide();
        $stats.fadeIn(300);
    });

    jQuery('.restart-button').click(function() {
        $gameArea.hide();
        $welcomeScreen.show();
        $stats.hide();

        $game.fadeIn(300);
    });

    jQuery('.quit').click(function() {
        window.close();
    });
});
