class Card {
    constructor(name, value, count, description) {
        this.name = name;
        this.value = value;
        this.count = count;
        this.description = description;
    }
}

class Player {
    constructor(id, name, isAI = false) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.hearts = 0;
        this.isProtected = false;
        this.isAlive = true;
        this.isAI = isAI;
        this.AILevel = 'normal'; // AI难度级别：easy, normal, hard
    }
}

class LoveLetterGame {
    constructor() {
        this.deck = [];
        this.discardPile = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameStatus = 'setup';
        this.roundNumber = 0; // 初始化为0，这样第一轮游戏时会触发添加分割线的逻辑
        // 添加状态变量初始化
        this.selectedCard = null;
        this.isReadyToPass = false;
        this.setupEventListeners();
        this.setupGameUI(); // 添加此行调用UI设置方法
        
        // 注意：模态框关闭按钮已移除，用户必须点击确认按钮完成选择
        const modal = document.getElementById('modal');
        
        // 实现showModal方法
        this.showModal = function(title, options, callback) {
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modal-title');
            const modalOptions = document.getElementById('modal-options');
            const modalConfirm = document.getElementById('modal-confirm');
            
            // 清除之前的事件监听器
            const newConfirm = modalConfirm.cloneNode(true);
            modalConfirm.parentNode.replaceChild(newConfirm, modalConfirm);
            
            // 确保确认按钮可见
            newConfirm.classList.remove('hidden');
            
            // 设置标题
            modalTitle.textContent = title;
            
            // 清空选项
            modalOptions.innerHTML = '';
            
            // 添加选项
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'modal-option';
            button.textContent = option.text;
            button.addEventListener('click', () => {
                // 移除所有选项的选中状态
                modalOptions.querySelectorAll('.modal-option').forEach(btn => {
                    btn.classList.remove('selected');
                });
                // 设置当前选项为选中状态
                button.classList.add('selected');
                // 保存选中的值
                modal.dataset.selectedValue = option.value;
                newConfirm.disabled = false;
            });
            modalOptions.appendChild(button);
        });
            
            // 禁用确认按钮直到有选择
            newConfirm.disabled = true;
            
            // 设置确认按钮点击事件
            newConfirm.onclick = () => {
                const selectedValue = modal.dataset.selectedValue;
                
                // 隐藏模态框
                modal.classList.add('hidden');
                
                // 调用回调函数
                callback(selectedValue);
            };
            
            // 显示模态框
            modal.classList.remove('hidden');
        };
    }

    // 新增：初始化游戏UI和开始按钮事件
    setupGameUI() {
        const startButton = document.getElementById('start-game');
        if (!startButton) {
            console.error('开始按钮元素未找到');
            return;
        }

        // 添加人类和AI玩家数量变化的监听
        const humanPlayerCount = document.getElementById('human-player-count');
        const aiPlayerCount = document.getElementById('ai-player-count');
        const totalPlayersInfo = document.getElementById('total-players-info');

        const updateTotalPlayers = () => {
            const humanCount = parseInt(humanPlayerCount.value);
            const aiCount = parseInt(aiPlayerCount.value);
            const totalCount = humanCount + aiCount;
            totalPlayersInfo.textContent = `总玩家数: ${totalCount}`;
            
            // 确保人类玩家+AI玩家不超过8
            if (totalCount > 8) {
                totalPlayersInfo.style.backgroundColor = '#ffebee';
                totalPlayersInfo.style.color = '#c62828';
                startButton.disabled = true;
            } else {
                totalPlayersInfo.style.backgroundColor = '#e8f5e8';
                totalPlayersInfo.style.color = '#333';
                startButton.disabled = false;
            }
        };

        humanPlayerCount.addEventListener('change', updateTotalPlayers);
        aiPlayerCount.addEventListener('change', updateTotalPlayers);

        // 初始化时调用一次
        updateTotalPlayers();

        startButton.addEventListener('click', () => {
            console.log('开始按钮被点击');
            const humanCount = parseInt(humanPlayerCount.value);
            const aiCount = parseInt(aiPlayerCount.value);
            
            if (isNaN(humanCount) || isNaN(aiCount) || humanCount < 1 || aiCount < 0 || (humanCount + aiCount) > 8) {
                alert('请选择有效的玩家人数（人类玩家至少1人，总人数不超过8人）');
                return;
            }

            try {
                this.startGame(humanCount, aiCount);
                document.getElementById('setup-screen').classList.add('hidden');
                document.getElementById('game-screen').classList.remove('hidden');
                
            } catch (error) {
                console.error('游戏启动失败:', error);
                alert('游戏启动失败，请查看控制台获取详细信息');
            }
        });
    }

    initializeDeck() {
        // 首先清空牌库，然后再添加新牌
        this.deck = [];
        
        // 创建标准16张牌
        const cardTypes = [
            new Card('卫兵', 1, 5, '猜测1名玩家手牌（非卫兵），若正确则对方出局'),
            new Card('牧师', 2, 2, '查看1名玩家手牌'),
            new Card('男爵', 3, 2, '与1名玩家比点数，较小者出局'),
            new Card('侍女', 4, 2, '免疫其他角色效果至下次回合'),
            new Card('王子', 5, 2, '指定1名玩家弃牌并重新抽1张（可选择自己）'),
            new Card('国王', 6, 1, '与1名玩家交换手牌'),
            new Card('伯爵夫人', 7, 1, '若手牌中有王子或国王，必须先弃置伯爵夫人'),
            new Card('公主', 8, 1, '若弃置或打出公主牌，玩家立即出局')
        ];

        // 使用唯一ID生成器
        let uniqueId = 0;

        // 构建牌堆
        cardTypes.forEach(cardType => {
            for (let i = 0; i < cardType.count; i++) {
                this.deck.push({...cardType, id: uniqueId++});
            }
        });

        // 洗牌
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    setupEventListeners() {
        console.log('setupEventListeners - 绑定事件监听器');
        // 修改：移除抽牌按钮事件监听
        // document.getElementById('draw-card').addEventListener('click', () => this.drawCard());
        document.getElementById('play-card').addEventListener('click', () => this.playCard());
        // 修改：移除结束回合按钮事件监听
        // document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
        const passButton = document.getElementById('pass-player');
        if (passButton) {
            console.log('setupEventListeners - 绑定pass-player按钮点击事件');
            passButton.addEventListener('click', () => {
                console.log('pass-player按钮被点击，当前回合:', this.roundNumber, 'isReadyToPass:', this.isReadyToPass);
                this.passPlayer();
            });
        } else {
            console.warn('setupEventListeners - 未找到pass-player按钮');
        }

        // 新增：卡牌点击选择事件
        document.getElementById('hand-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('card') && this.gameStatus === 'playing') {
                const cardId = parseInt(e.target.dataset.cardId);
                this.selectCard(cardId);
            }
        });

        // 新增：查看弃牌堆详情功能
        const discardIcon = document.getElementById('view-discard-details');
        const discardDetails = document.getElementById('discard-details');
        
        discardIcon.addEventListener('mouseenter', () => {
            this.showDiscardDetails();
            discardDetails.classList.remove('hidden');
        });
        
        discardIcon.addEventListener('mouseleave', () => {
            discardDetails.classList.add('hidden');
        });
        
        // 防止悬停区域意外关闭
        discardDetails.addEventListener('mouseenter', () => {
            discardDetails.classList.remove('hidden');
        });
        
        discardDetails.addEventListener('mouseleave', () => {
            discardDetails.classList.add('hidden');
        });
    }

    startGame(humanPlayers = 1, aiPlayers = 1) {
        // 防止重复初始化
        if (this.gameStatus === 'playing' && this.players && this.players.length > 0) {
            console.log('游戏已经在进行中，跳过重复初始化');
            return;
        }

        // 保存现有玩家的爱心标记
        const existingHearts = {};
        if (this.players && this.players.length > 0) {
            this.players.forEach(player => {
                existingHearts[player.name] = player.hearts;
            });
        }

        this.initializeDeck(); // 添加此行初始化牌库
        // 初始化玩家
        this.players = [];
        
        // 创建人类玩家
        for (let i = 0; i < humanPlayers; i++) {
            const playerName = `玩家 ${i + 1}`;
            const newPlayer = new Player(i, playerName, false);
            // 恢复爱心标记
            if (existingHearts[playerName] !== undefined) {
                newPlayer.hearts = existingHearts[playerName];
            }
            this.players.push(newPlayer);
        }
        
        // 创建AI玩家
        const totalHumanPlayers = humanPlayers;
        for (let i = 0; i < aiPlayers; i++) {
            const playerName = `电脑 ${i + 1}`;
            const newPlayer = new Player(totalHumanPlayers + i, playerName, true);
            // 恢复爱心标记
            if (existingHearts[playerName] !== undefined) {
                newPlayer.hearts = existingHearts[playerName];
            }
            this.players.push(newPlayer);
        }

        // 移除顶部1张牌
        this.deck.shift();

        // 2人游戏额外移除3张可见牌
        if (this.players.length === 2) {
            this.deck.splice(0, 3);
        }

        // 每位玩家抽1张起始手牌
        this.players.forEach(player => {
            if (this.deck.length > 0) {
                player.hand.push(this.deck.shift());
            }
        });

        // 游戏开始时随机选择首发玩家（第一轮没有淘汰记录）
        const alivePlayers = this.players.filter(p => p.isAlive);
        if (alivePlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * alivePlayers.length);
            this.currentPlayerIndex = alivePlayers[randomIndex].id;
        } else {
            this.currentPlayerIndex = 0;
        }
        
        // 初始化淘汰记录
        this.eliminatedOrder = [];
        this.lastRoundWinner = null;

        this.gameStatus = 'playing';
        this.isReadyToPass = false;
        this.selectedCard = null;
        this.hasDrawnThisTurn = false;
        
        // 启动第一个玩家的回合
        setTimeout(() => {
            // 设置第一轮为1
            if (this.roundNumber === 0) {
                this.roundNumber = 1; // 确保第一轮为1
            }

            // 显示首发玩家遮罩
            this.showFirstPlayerOverlay();
            // 在玩家回合开始日志前添加分割线
            if (this.roundNumber === 1) {
                // 第一轮游戏时添加分割线
                const logElement = document.createElement('li');
                logElement.style.textAlign = 'center';
                logElement.style.backgroundColor = 'transparent';
                logElement.style.color = '#555';
                logElement.style.fontSize = '16px';
                logElement.style.padding = '10px 0';
                logElement.style.borderBottom = '1px solid #ddd';
                logElement.textContent = `第 ${this.roundNumber} 轮 开始`;
                const logContainer = document.getElementById('log-messages');
                logContainer.prepend(logElement);
            } else if (!isNewGame) {
                // 非第一轮游戏时已经在resetRound中添加了分割线，这里不重复添加
            }
            this.startPlayerTurn();
        }, 1000);
    }

    startPlayerTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // 重置回合状态变量
        this.hasDrawnThisTurn = false;
        this.selectedCard = null;
        this.isReadyToPass = false;
        
        // 重置保护状态
        currentPlayer.isProtected = false;
        
        

        // 自动抽牌（如果只有1张手牌）
        this.autoDrawCard();
        
        this.updateUI();
        
        // 如果是AI玩家，自动执行其回合
        if (currentPlayer.isAI) {
            // 不再使用定时器，直接调用autoPlayAITurn，避免异步执行导致的问题
            this.autoPlayAITurn();
        }
    }

    // 自动抽牌逻辑 - 严格按照游戏流程
    autoDrawCard() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        if (this.deck.length === 0) {
            this.checkGameOver();
            return;
        }
        
        // 每个玩家回合开始时抽1张牌（起始手牌除外）
        if (currentPlayer.hand.length === 1 && !this.hasDrawnThisTurn) {
            currentPlayer.hand.push(this.deck.shift());
            this.hasDrawnThisTurn = true;
            
            // 只在游戏进行中且非首次发牌时显示抽牌消息
            // 使用牌库剩余牌数判断是否为初始发牌阶段
            const isInitialDeal = this.discardPile.length === 0 && this.deck.length >= 14;
            if (this.gameStatus === 'playing' && !isInitialDeal) {
                this.logMessage(`${currentPlayer.name} 自动抽牌`);
            }
        }
        
        // 更新UI显示当前状态
        this.updateUI();
    }

    drawCard() {
        if (this.deck.length === 0) return;

        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer.hand.length < 2) {
            currentPlayer.hand.push(this.deck.shift());
            document.getElementById('draw-card').disabled = true;
            document.getElementById('play-card').disabled = false;
            this.updateUI();
            this.logMessage(`${currentPlayer.name} 抽了一张牌`);
        }
    }

    async playCard() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // 检查是否有手牌
        if (currentPlayer.hand.length === 0) {
            this.logMessage('没有手牌可出');
            return;
        }

        // 确保卡牌在当前玩家手牌中
        const cardIndex = currentPlayer.hand.findIndex(card => card.id === this.selectedCard.id);
        if (cardIndex === -1) {
            this.logMessage('选择的卡牌不存在');
            return;
        }

        const playedCard = currentPlayer.hand[cardIndex];
        
        // 检查是否持有伯爵夫人时打出王子或国王
        const hasCountess = currentPlayer.hand.some(c => c.value === 7);
        if (hasCountess && (playedCard.value === 5 || playedCard.value === 6)) {
            this.logMessage(`${currentPlayer.name} 必须先弃置伯爵夫人！`);
            this.selectedCard = null;
            this.updateUI();
            return;
        }

        // 出牌流程：移除卡牌 -> 处理效果 -> 检查游戏结束 -> 设置移交状态
        currentPlayer.hand.splice(cardIndex, 1);
        this.discardPile.push(playedCard);
        
        this.logMessage(`${currentPlayer.name} 打出了 ${playedCard.name}`);
        
        try {
            // 处理卡牌效果（同步处理非异步卡牌，异步处理需要等待的卡牌）
            if (playedCard.value === 1 || playedCard.value === 2 || playedCard.value === 3 || playedCard.value === 5 || playedCard.value === 6) {
                // 这些卡牌需要异步处理
                await this.handleCardEffectAsync(playedCard);
            } else {
                // 侍女、伯爵夫人、公主等可以同步处理
                this.handleCardEffectSync(playedCard);
            }
            
            // 检查游戏是否结束
            const gameEnded = this.checkGameOver();
            
            // 只有游戏未结束时才设置移交状态
            if (!gameEnded) {
                this.isReadyToPass = true;
                this.selectedCard = null;
                this.logMessage(`${currentPlayer.name} 出牌完成`);
                await this.delay(300);
                
                // 对于人类玩家，启用移交按钮；对于AI玩家，自动移交
                if (currentPlayer.isAI) {
                    // AI玩家自动移交
                    // 不再使用定时器，直接调用passPlayer，避免异步执行导致的问题
                    this.passPlayer();
                } else {
                    // 确保移交玩家按钮状态正确更新
                    const passButton = document.getElementById('pass-player');
                    if (passButton) {
                        passButton.disabled = false;
                        console.log(`playCard - 设置pass-player按钮为可用状态 (回合: ${this.roundNumber}, 玩家: ${currentPlayer.name})`);
                        console.log(`playCard - 当前isReadyToPass: ${this.isReadyToPass}`);
                    } else {
                        console.warn('playCard - 未找到pass-player按钮');
                    }
                    this.logMessage('请点击"移交玩家"按钮结束回合');
                }
            }
        } catch (error) {
            console.error('出牌处理出错:', error);
            this.logMessage('出牌处理出错，但卡牌已打出，无法取消');
            // 注意：此处不再恢复卡牌状态，确保出牌后无法取消
            this.selectedCard = null;
        }
        
        this.updateUI();
    }

    // 同步处理不需要用户交互的卡牌效果
    handleCardEffectSync(card) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        switch(card.value) {
            case 4: // 侍女
                currentPlayer.isProtected = true;
                this.logMessage(`${currentPlayer.name} 获得保护，免疫下次回合前的效果`);
                break;
            case 7: // 伯爵夫人
                // 若手牌中有王子或国王，必须先弃置伯爵夫人
                const hasPrinceOrKing = currentPlayer.hand.some(c => c.value === 5 || c.value === 6);
                if (hasPrinceOrKing) {
                    this.logMessage(`${currentPlayer.name} 因持有王子/国王，必须弃置伯爵夫人`);
                }
                break;
            case 8: // 公主
                currentPlayer.isAlive = false;
                this.eliminatedOrder.push(currentPlayer.name);
                this.logMessage(`${currentPlayer.name} 打出了公主，出局`);
                break;
        }
    }

    // 异步处理需要用户交互的卡牌效果
    async handleCardEffectAsync(card) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // 如果是AI玩家，使用AI决策逻辑
        if (currentPlayer.isAI) {
            await this.handleAICardEffect(card, currentPlayer);
        } else {
            switch(card.value) {
                case 1: // 卫兵
                    await this.handleGuardEffect(currentPlayer);
                    break;
                case 2: // 牧师
                    await this.handlePriestEffect(currentPlayer);
                    break;
                case 3: // 男爵
                    await this.handleBaronEffect(currentPlayer);
                    break;
                case 5: // 王子
                    await this.handlePrinceEffect(currentPlayer);
                    break;
                case 6: // 国王
                    await this.handleKingEffect(currentPlayer);
                    break;
            }
        }
    }
    
    // AI处理卡牌效果
    async handleAICardEffect(card, currentPlayer) {
        await this.delay(300);
        switch(card.value) {
            case 1: // 卫兵
                await this.handleAIGuardEffect(currentPlayer);
                break;
            case 2: // 牧师
                await this.handleAIPriestEffect(currentPlayer);
                break;
            case 3: // 男爵
                await this.handleAIBaronEffect(currentPlayer);
                break;
            case 5: // 王子
                await this.handleAIPrinceEffect(currentPlayer);
                break;
            case 6: // 国王
                await this.handleAIKingEffect(currentPlayer);
                break;
        }
    }
    
    // AI处理卫兵效果
    async handleAIGuardEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive && 
            p.id !== currentPlayer.id && 
            !p.isProtected
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，卫兵效果跳过");
            return;
        }
        
        // AI选择目标玩家
        const targetPlayer = this.aiSelectTargetPlayer(selectablePlayers, 'guard');
        this.logMessage(`${currentPlayer.name} 选择了目标: ${targetPlayer.name}`);
        await this.delay(500);
        
        // AI猜测卡牌
        const guessValue = this.aiGuessCard();
        
        const targetCard = targetPlayer.hand[0];
        const guessedCardName = this.getCardNameByValue(guessValue);
        if (targetCard && targetCard.value == guessValue) {
            targetPlayer.isAlive = false;
            this.eliminatedOrder.push(targetPlayer.name);
            this.logMessage(`${currentPlayer.name} 猜测${targetPlayer.name}是${guessedCardName}(${guessValue})，猜对了! ${targetPlayer.name} 出局`);
        } else {
            this.logMessage(`${currentPlayer.name} 猜测${targetPlayer.name}是${guessedCardName}(${guessValue})，猜错了`);
        }
        await this.delay(500);
    }
    
    // AI选择目标玩家
    aiSelectTargetPlayer(availablePlayers, cardType) {
        try {
            // 根据卡牌类型和策略选择目标
            if (availablePlayers.length === 0) return null;
            if (availablePlayers.length === 1) return availablePlayers[0];
            
            // 简单策略：优先选择威胁最大的玩家
            let bestTarget = availablePlayers[0];
            let maxThreat = this.calculateTargetThreat(bestTarget, cardType);
            
            availablePlayers.forEach(player => {
                const threat = this.calculateTargetThreat(player, cardType);
                if (threat > maxThreat) {
                    maxThreat = threat;
                    bestTarget = player;
                }
            });
            
            // 添加随机因子，15%概率选择其他目标，避免AI行为过于可预测
            if (availablePlayers.length > 2 && Math.random() < 0.15) {
                const otherPlayers = availablePlayers.filter(p => p !== bestTarget);
                return otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            }
            
            return bestTarget;
        } catch (error) {
            console.error('AI目标选择出错:', error);
            // 兜底：随机选择一个目标玩家
            return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
        }
    }
    
    // 计算目标威胁值
    calculateTargetThreat(player, cardType) {
        // 基础威胁值 = 爱心标记数量
        let threat = player.hearts;
        
        // 根据卡牌类型调整
        switch(cardType) {
            case 'guard':
                // 卫兵：优先猜测可能持有高价值卡牌的玩家
                threat += this.estimateHighValueCardProbability(player) * 2;
                break;
            case 'priest':
                // 牧师：优先选择信息价值高的玩家
                threat += this.estimateHighValueCardProbability(player) * 1.5;
                break;
            case 'baron':
                // 男爵：优先选择可能手牌较弱的玩家
                const estimatedValue = this.estimateAveragePlayerValue();
                threat -= estimatedValue / 5; // 价值越低，威胁值越低（越优先选择）
                break;
            case 'prince':
                // 王子：优先选择可能持有公主的玩家
                const remainingCards = this.getRemainingCards();
                if (remainingCards['公主'] > 0) {
                    threat += 3; // 如果公主还在游戏中，优先选择
                }
                break;
            case 'king':
                // 国王：优先选择可能手牌较好的玩家
                threat += this.estimateHighValueCardProbability(player) * 2;
                break;
        }
        
        // 增加一些随机性，避免AI行为过于可预测
        if (Math.random() < 0.2) {
            threat += (Math.random() - 0.5) * 2; // 随机调整±1
        }
        
        return threat;
    }
    
    // AI猜测卡牌
    aiGuessCard() {
        const remainingCards = this.getRemainingCards();
        const guessableCards = [2, 3, 4, 5, 6, 7, 8]; // 卫兵不能猜测自己
        
        // 优先猜测出现次数少的高价值卡牌
        const weightedCards = [];
        guessableCards.forEach(value => {
            const cardName = this.getCardNameByValue(value);
            const count = remainingCards[cardName] || 0;
            
            // 高价值卡牌和剩余数量多的卡牌权重更高
            const weight = value * (count + 1);
            for (let i = 0; i < weight; i++) {
                weightedCards.push(value);
            }
        });
        
        // 随机选择一个猜测
        if (weightedCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * weightedCards.length);
            return weightedCards[randomIndex];
        }
        
        // 兜底：随机选择一个
        return guessableCards[Math.floor(Math.random() * guessableCards.length)];
    }
    
    // 根据卡牌价值获取名称
    getCardNameByValue(value) {
        const nameMap = {
            1: '卫兵', 2: '牧师', 3: '男爵', 4: '侍女', 5: '王子', 6: '国王', 7: '伯爵夫人', 8: '公主'
        };
        return nameMap[value] || '';
    }
    
    // AI处理牧师效果
    async handleAIPriestEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive && 
            p.id !== currentPlayer.id && 
            !p.isProtected
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，牧师效果跳过");
            return;
        }
        
        // AI选择目标玩家
        const targetPlayer = this.aiSelectTargetPlayer(selectablePlayers, 'priest');
        this.logMessage(`${currentPlayer.name} 选择了目标: ${targetPlayer.name}`);
        await this.delay(500);
        
        // AI查看目标手牌（实际游戏中不会显示给人类玩家）
        this.logMessage(`${currentPlayer.name} 查看了 ${targetPlayer.name} 的手牌`);
        await this.delay(500);
    }
    
    // AI处理男爵效果
    async handleAIBaronEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive && 
            p.id !== currentPlayer.id && 
            !p.isProtected
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，男爵效果跳过");
            return;
        }
        
        // AI选择目标玩家（优先选择可能手牌较弱的）
        const targetPlayer = this.aiSelectTargetPlayer(selectablePlayers, 'baron');
        this.logMessage(`${currentPlayer.name} 选择了目标: ${targetPlayer.name}`);
        await this.delay(500);
        
        const currentCardValue = currentPlayer.hand.reduce((sum, c) => sum + c.value, 0);
        const targetCardValue = targetPlayer.hand.reduce((sum, c) => sum + c.value, 0);
        this.logMessage(`${currentPlayer.name} (${currentCardValue}) 与 ${targetPlayer.name} (${targetCardValue}) 比大小`);
        await this.delay(500);
        
        if (currentCardValue > targetCardValue) {
            targetPlayer.isAlive = false;
            this.eliminatedOrder.push(targetPlayer.name);
            this.logMessage(`${targetPlayer.name} 点数较小，出局`);
        } else if (currentCardValue < targetCardValue) {
            currentPlayer.isAlive = false;
            this.eliminatedOrder.push(currentPlayer.name);
            this.logMessage(`${currentPlayer.name} 点数较小，出局`);
        } else {
            this.logMessage(`点数相同，无人出局`);
        }
        await this.delay(500);
    }
    
    // AI处理王子效果
    async handleAIPrinceEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，王子效果跳过");
            return;
        }
        
        // AI选择目标玩家（优先选择威胁最大的或自己）
        const targetPlayer = this.aiSelectTargetPlayer(selectablePlayers, 'prince');
        this.logMessage(`${currentPlayer.name} 选择了目标: ${targetPlayer.name}`);
        await this.delay(500);
        
        if (targetPlayer.hand.length > 0) {
            const discardedCard = targetPlayer.hand.pop();
            this.discardPile.push(discardedCard);
            
            if (discardedCard.value === 8) {
                targetPlayer.isAlive = false;
                this.eliminatedOrder.push(targetPlayer.name);
                this.logMessage(`${targetPlayer.name} 弃置了${discardedCard.name}(${discardedCard.value})，出局`);
            } else {
                
                if (this.deck.length > 0) {
                    targetPlayer.hand.push(this.deck.shift());
                }
                this.logMessage(`${currentPlayer.name} 让 ${targetPlayer.name} 弃置了${discardedCard.name}(${discardedCard.value})并重新抽牌`);
            }
            await this.delay(500);
        }
    }
    
    // AI处理国王效果
    async handleAIKingEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive && 
            p.id !== currentPlayer.id && 
            !p.isProtected
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，国王效果跳过");
            return;
        }
        
        // AI选择目标玩家（优先选择可能手牌较好的）
        const targetPlayer = this.aiSelectTargetPlayer(selectablePlayers, 'king');
        this.logMessage(`${currentPlayer.name} 选择了目标: ${targetPlayer.name}`);
        await this.delay(500);
        
        [currentPlayer.hand, targetPlayer.hand] = [targetPlayer.hand, currentPlayer.hand];
        this.logMessage(`${currentPlayer.name} 与 ${targetPlayer.name} 交换了手牌`);
    }

    async handleGuardEffect(currentPlayer) {
        const selectablePlayers = this.players.filter(p => 
            p.isAlive && 
            p.id !== currentPlayer.id && 
            !p.isProtected
        );

        if (selectablePlayers.length === 0) {
            this.logMessage("没有可选择的目标玩家，卫兵效果跳过");
            // 确保UI更新，避免按钮状态异常
            this.updateUI();
            return;
        }

        const playerOptions = selectablePlayers.map(p => ({
            text: p.name,
            value: p.id
        }));
        
        const selectedPlayerId = await this.promptTargetPlayerAsync(playerOptions);
        if (!selectedPlayerId) return;
        
        const targetPlayer = this.players.find(p => p.id == selectedPlayerId);
        
        const guessOptions = [
            { text: '牧师 (2)', value: 2 },
            { text: '男爵 (3)', value: 3 },
            { text: '侍女 (4)', value: 4 },
            { text: '王子 (5)', value: 5 },
            { text: '国王 (6)', value: 6 },
            { text: '伯爵夫人 (7)', value: 7 },
            { text: '公主 (8)', value: 8 }
        ];
        
        const guess = await this.promptSelectionAsync('请猜测目标玩家的手牌:', guessOptions);
        if (guess === null) return;
        
        const targetCard = targetPlayer.hand[0];
            const guessedCardName = this.getCardNameByValue(guess);
        if (targetCard && targetCard.value == guess) {
                targetPlayer.isAlive = false;
                this.eliminatedOrder.push(targetPlayer.name);
                this.logMessage(`${currentPlayer.name} 猜测${targetPlayer.name}是${guessedCardName}(${guess})，猜对了! ${targetPlayer.name} 出局`);
            } else {
                this.logMessage(`${currentPlayer.name} 猜测${targetPlayer.name}是${guessedCardName}(${guess})，猜错了`);
            }
    }

    async handlePriestEffect(currentPlayer) {
        const targetPlayerId = await this.promptTargetPlayerAsync();
        if (!targetPlayerId) return;
        
        const targetPlayer = this.players.find(p => p.id === parseInt(targetPlayerId));
        if (!targetPlayer || targetPlayer.isProtected) {
            if (targetPlayer) {
                this.logMessage(`${targetPlayer.name} 被侍女保护，牧师效果无效`);
            }
            return;
        }
        
        const targetCard = targetPlayer.hand[0];
        if (targetCard) {
            this.logMessage(`${currentPlayer.name} 查看了 ${targetPlayer.name} 的手牌`);
            // 显示玩家名和手牌内容，3秒后自动关闭
            await this.showModalAsync(`查看 ${targetPlayer.name} 的手牌`, `${targetCard.name} (${targetCard.value})`, true);
        }
    }

    async handleBaronEffect(currentPlayer) {
        const targetPlayerId = await this.promptTargetPlayerAsync();
        if (!targetPlayerId) return;
        
        const targetPlayer = this.players.find(p => p.id === parseInt(targetPlayerId));
        if (!targetPlayer || targetPlayer.isProtected) {
            if (targetPlayer) {
                this.logMessage(`${targetPlayer.name} 被侍女保护，男爵效果无效`);
            }
            return;
        }
        
        const currentCardValue = currentPlayer.hand.reduce((sum, c) => sum + c.value, 0);
        const targetCardValue = targetPlayer.hand.reduce((sum, c) => sum + c.value, 0);
        this.logMessage(`${currentPlayer.name} (${currentCardValue}) 与 ${targetPlayer.name} (${targetCardValue}) 比大小`);
        
        if (currentCardValue > targetCardValue) {
            targetPlayer.isAlive = false;
            this.eliminatedOrder.push(targetPlayer.name);
            this.logMessage(`${targetPlayer.name} 点数较小，出局`);
        } else if (currentCardValue < targetCardValue) {
            currentPlayer.isAlive = false;
            this.eliminatedOrder.push(currentPlayer.name);
            this.logMessage(`${currentPlayer.name} 点数较小，出局`);
        } else {
            this.logMessage(`点数相同，无人出局`);
        }
    }

    async handlePrinceEffect(currentPlayer) {
        const targetPlayerId = await this.promptTargetPlayerAsync();
        if (!targetPlayerId) return;
        
        const targetPlayer = this.players.find(p => p.id === parseInt(targetPlayerId));
        if (!targetPlayer) return;
        
        if (targetPlayer.hand.length > 0) {
            const discardedCard = targetPlayer.hand.pop();
            this.discardPile.push(discardedCard);
            
            if (discardedCard.value === 8) {
                targetPlayer.isAlive = false;
                this.eliminatedOrder.push(targetPlayer.name);
                this.logMessage(`${targetPlayer.name} 弃置了${discardedCard.name}(${discardedCard.value})，出局`);
            } else {
                
                if (this.deck.length > 0) {
                    targetPlayer.hand.push(this.deck.shift());
                }
                this.logMessage(`${currentPlayer.name} 让 ${targetPlayer.name} 弃置了${discardedCard.name}(${discardedCard.value})并重新抽牌`);
            }
        }
    }

    async handleKingEffect(currentPlayer) {
        const targetPlayerId = await this.promptTargetPlayerAsync();
        if (!targetPlayerId) return;
        
        const targetPlayer = this.players.find(p => p.id === parseInt(targetPlayerId));
        if (!targetPlayer || targetPlayer.isProtected) {
            if (targetPlayer) {
                this.logMessage(`${targetPlayer.name} 被侍女保护，国王效果无效`);
            }
            return;
        }
        
        [currentPlayer.hand, targetPlayer.hand] = [targetPlayer.hand, currentPlayer.hand];
        this.logMessage(`${currentPlayer.name} 与 ${targetPlayer.name} 交换了手牌`);
    }

     promptTargetPlayer() {
        return new Promise(resolve => {
            // 获取可选择的目标玩家（排除自己和被保护的玩家）
            const currentPlayer = this.players[this.currentPlayerIndex];
            const selectablePlayers = this.players.filter(p => 
                p.isAlive && 
                p.id !== currentPlayer.id && 
                !p.isProtected
            );

            if (selectablePlayers.length === 0) {
                this.logMessage("没有可选择的目标玩家");
                resolve(null);
                return;
            }

            // 使用模态框选择目标玩家
            const playerOptions = selectablePlayers.map(p => ({
                text: p.name,
                value: p.id
            }));
            
            // 修复：移除多余的false参数，确保回调函数正确执行
            this.showModal('请选择目标玩家:', playerOptions, (selectedPlayerId) => {
                resolve(selectedPlayerId);
            });
        });
    }

    async promptTargetPlayerAsync(options = null) {
        return new Promise(resolve => {
            const currentPlayer = this.players[this.currentPlayerIndex];
            let targetPlayers;
            
            if (options) {
                targetPlayers = this.players.filter(p => 
                    p.isAlive && 
                    p.id !== currentPlayer.id && 
                    !p.isProtected && 
                    options.some(opt => opt.value == p.id)
                );
            } else {
                targetPlayers = this.players.filter(p => 
                    p.isAlive && 
                    p.id !== currentPlayer.id && 
                    !p.isProtected
                );
            }

            if (targetPlayers.length === 0) {
                this.logMessage("没有可选择的目标玩家");
                resolve(null);
                return;
            }

            const finalOptions = options || targetPlayers.map(p => ({
                text: p.name,
                value: p.id
            }));

            this.showModal('请选择目标玩家:', finalOptions, (value) => {
                resolve(value);
            });
        });
    }

    async promptSelectionAsync(title, options) {
        return new Promise(resolve => {
            if (!options || options.length === 0) {
                resolve(null);
                return;
            }

            this.showModal(title, options, (value) => {
                resolve(value);
            });
        });
    }

    async showModalAsync(title, message, autoClose = false) {
        return new Promise(resolve => {
            // 创建自定义模态框内容
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modal-title');
            const modalOptions = document.getElementById('modal-options');
            const modalConfirm = document.getElementById('modal-confirm');
            
            // 设置标题
            modalTitle.textContent = title;
            
            // 清空选项
            modalOptions.innerHTML = '';
            
            // 添加消息文本（不是按钮）
            const messageElement = document.createElement('div');
            messageElement.className = 'modal-message';
            messageElement.textContent = message;
            modalOptions.appendChild(messageElement);
            
            if (autoClose) {
                // 移除确认按钮
                modalConfirm.classList.add('hidden');
                
                // 添加倒计时提示
                let seconds = 1.5;
                const countdownElement = document.createElement('div');
                countdownElement.className = 'modal-countdown';
                countdownElement.textContent = `${seconds}秒后自动关闭`;
                modalOptions.appendChild(countdownElement);
                
                // 设置倒计时更新 - 使用更精细的间隔以显示更准确的倒计时
                const countdownInterval = setInterval(() => {
                    seconds -= 0.1;
                    // 保留一位小数
                    seconds = Math.max(0, Math.round(seconds * 10) / 10);
                    countdownElement.textContent = `${seconds}秒后自动关闭`;
                }, 100);
                
                // 1.5秒后自动关闭
                const closeTimer = setTimeout(() => {
                    clearInterval(countdownInterval);
                    modal.classList.add('hidden');
                    resolve();
                }, 1500);
                
                // 防止用户点击模态框外部关闭
                modal.addEventListener('click', (e) => e.stopPropagation());
                
                // 显示模态框
                modal.classList.remove('hidden');
            } else {
                // 正常模式下显示确认按钮
                modalConfirm.classList.remove('hidden');
                modalConfirm.onclick = () => {
                    modal.classList.add('hidden');
                    resolve();
                };
                
                // 显示模态框
                modal.classList.remove('hidden');
            }
        });
    }

    endTurn() {
        // 检查游戏结束条件
        if (this.checkGameOver()){
            // 游戏结束时，确保isReadyToPass不会阻止新一轮游戏
            this.isReadyToPass = false;
            this.resetRound();
            return;
        } 
        else{
        console.log(`endTurn - 设置isReadyToPass为true (回合: ${this.roundNumber})`);
        this.isReadyToPass = true;
        if (document.getElementById('play-card')) {
            document.getElementById('play-card').disabled = true;
        }
        if (document.getElementById('pass-player')) {
            const passButton = document.getElementById('pass-player');
            passButton.disabled = false;
            console.log(`endTurn - 设置pass-player按钮为可用状态 (回合: ${this.roundNumber})`);
        }
        const currentPlayer = this.players[this.currentPlayerIndex];
        this.logMessage(`${currentPlayer.name} 请点击"移交玩家"按钮结束回合`);
        }
        this.updateUI(); // 确保UI更新，显示移交玩家按钮可用
    };

    passPlayer() {
        console.log(`passPlayer - 开始处理玩家移交 (当前回合: ${this.roundNumber}, 当前玩家索引: ${this.currentPlayerIndex})`);
        console.log(`passPlayer - 当前isReadyToPass状态: ${this.isReadyToPass}`);
        
        // 获取下一个存活的玩家索引
        let nextPlayerIndex = this.currentPlayerIndex;
        let attempts = 0;
        const maxAttempts = this.players.length;
        
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
            attempts++;
        } while (!this.players[nextPlayerIndex].isAlive && attempts < maxAttempts);
        
        const nextPlayer = this.players[nextPlayerIndex];
        console.log(`passPlayer - 下一个玩家: ${nextPlayer.name}, 是AI: ${nextPlayer.isAI}`);
        
        const overlay = document.getElementById('pass-overlay');
        const passMessage = document.getElementById('pass-message');
        const nextPlayerName = document.getElementById('next-player-name');
        
        // 如果是AI玩家，不显示弹窗，直接处理
        if (nextPlayer.isAI) {
            // 不需要显示弹窗，直接执行移交逻辑
            // 不再使用定时器，直接调用completePassPlayer，避免异步执行导致的问题
            this.completePassPlayer(nextPlayerIndex);
        } else {
            // 人类玩家时，确保保留HTML结构，只更新玩家名称
            if (nextPlayerName) {
                nextPlayerName.textContent = nextPlayer.name;
                // 确保pass-message显示正确的提示文本
                if (passMessage) {
                    const passMsgHTML = '请将设备移交给玩家 <span id="next-player-name">' + nextPlayer.name + '</span>';
                    passMessage.innerHTML = passMsgHTML;
                }
            }
            overlay.classList.remove('hidden');
            
            // 设置继续按钮事件
            const continueBtn = document.getElementById('pass-continue');
            
            // 移除所有之前可能存在的事件监听器（使用标准的DOM方法）
            // 先获取一个干净的按钮元素
            const cleanBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(cleanBtn, continueBtn);
            
            // 获取替换后的干净按钮并绑定新的事件监听器
            const updatedContinueBtn = document.getElementById('pass-continue');
            
            // 创建一个命名函数作为事件处理程序
            const continueHandler = () => {
                // 移除遮罩层
                overlay.classList.add('hidden');
                
                // 执行移交逻辑
                this.completePassPlayer(nextPlayerIndex);
            };
            
            // 绑定事件监听器
            updatedContinueBtn.addEventListener('click', continueHandler);
        }
    }

    completePassPlayer(nextPlayerIndex) {
        console.log(`completePassPlayer - 完成玩家移交 (回合: ${this.roundNumber}, 从索引: ${this.currentPlayerIndex} 到索引: ${nextPlayerIndex})`);
        // 切换到下一个存活玩家
        this.currentPlayerIndex = nextPlayerIndex;

        this.isReadyToPass = false;
        console.log(`completePassPlayer - 重置isReadyToPass为false`);
        this.selectedCard = null;
        this.hasDrawnThisTurn = false;
        
        // 更新按钮状态
        const passButton = document.getElementById('pass-player');
        if (passButton) {
            passButton.disabled = true;
            console.log(`completePassPlayer - 设置pass-player按钮为禁用状态`);
        }
        
        // 重置当前玩家的保护状态
        this.players[this.currentPlayerIndex].isProtected = false;
        
        // 自动为下一个玩家抽牌
        this.startPlayerTurn();
        
        // 更新UI
        console.log(`completePassPlayer - 调用updateUI更新界面`);
        this.updateUI();
        
        // 调试信息：检查新回合开始时的按钮状态
        console.log(`completePassPlayer - 新回合开始，玩家: ${this.players[this.currentPlayerIndex].name}`);
        this.debugButtonStatus();
        
    


        this.logMessage(`${this.players[this.currentPlayerIndex].name} 的回合开始`);
    }

    // 检查按钮状态的辅助方法，用于调试
    debugButtonStatus() {
        const passButton = document.getElementById('pass-player');
        if (passButton) {
            console.log(`debugButtonStatus - 回合: ${this.roundNumber}, 玩家: ${this.players[this.currentPlayerIndex].name}, isReadyToPass: ${this.isReadyToPass}, 按钮禁用状态: ${passButton.disabled}`);
            // 检查按钮上有哪些事件监听器
            const clonedButton = passButton.cloneNode(true);
            console.log(`debugButtonStatus - 按钮是否被克隆: ${clonedButton !== null}`);
        } else {
            console.warn('debugButtonStatus - 未找到pass-player按钮');
        }
    }

    // 增加回合数的方法
    incrementRoundNumber() {
        this.roundNumber++;
        console.log(`incrementRoundNumber - 进入第${this.roundNumber}回合`);
    }
    
    // 自动执行AI玩家的回合
    async autoPlayAITurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // 如果不是AI玩家或游戏状态不是playing，则不执行
        if (!currentPlayer.isAI || this.gameStatus !== 'playing') {
            return;
        }
        
        // 根据用户要求，AI操作时不需要显示弹窗
        // 只需要在日志中显示操作即可
        this.logMessage(`${currentPlayer.name} 正在思考...`);
        
        
        try {
            // AI思考延迟
            await this.delay(1000);
            
            // 等待手牌准备就绪
            let waitCount = 0;
            while (currentPlayer.hand.length < 2 && this.deck.length > 0 && waitCount < 5) {
                await this.delay(500);
                waitCount++;
            }
            
            // AI选择卡牌
            const selectedCard = await this.aiChooseCard(currentPlayer);
            this.selectedCard = selectedCard;
            await this.delay(300);

            // 执行出牌
            await this.playCard();
            
            // 不再需要自动调用passPlayer，因为playCard方法中已经处理了移交逻辑
            // 通过updateUI确保界面正确更新

            this.updateUI();
        } catch (error) {
            console.error('AI出牌出错:', error);
            this.logMessage(`${currentPlayer.name} 操作出错，跳过本轮`);
            // 确保游戏能够继续进行
            this.isReadyToPass = true;
            setTimeout(() => {
                this.passPlayer();
            }, 500);
        } finally {
            // 无需隐藏提示，因为我们没有显示弹窗
        }
    }
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // AI选择卡牌
    async aiChooseCard(player) {
        await this.delay(400);
        try {
            // 根据NPC策略.ini中的优先级选择卡牌
            // 1. 检查是否有强制弃牌规则（伯爵夫人+王子/国王）
            const hasCountess = player.hand.some(c => c.value === 7);
            const hasPrinceOrKing = player.hand.some(c => c.value === 5 || c.value === 6);
            
            if (hasCountess && hasPrinceOrKing) {
                return player.hand.find(c => c.value === 7) || player.hand[0];
            }
            
            // 2. 避免弃置公主
            const princessCard = player.hand.find(c => c.value === 8);
            if (princessCard && player.hand.length > 1) {
                // 如果有公主且有其他牌，优先出其他牌
                const otherCards = player.hand.filter(c => c.value !== 8);
                return this.aiSelectOptimalCard(otherCards, player);
            }
            
            // 3. 选择最优卡牌
            return this.aiSelectOptimalCard(player.hand, player) || player.hand[0];
        } catch (error) {
            console.error('AI卡牌选择出错:', error);
            // 兜底：随机选择一张卡牌
            return player.hand[Math.floor(Math.random() * player.hand.length)];
        }
    }
    
    // AI选择最优卡牌
    aiSelectOptimalCard(cards, player) {
        try {
            // 根据卡牌价值和当前游戏状态选择最优卡牌
            // 获取存活玩家数量
            const alivePlayers = this.players.filter(p => p.isAlive).length;
            
            // 卡牌价值评分表
            const cardValues = {
                1: this.calculateGuardValue.bind(this), // 卫兵
                2: this.calculatePriestValue.bind(this), // 牧师
                3: this.calculateBaronValue.bind(this), // 男爵
                4: this.calculateMaidValue.bind(this), // 侍女
                5: this.calculatePrinceValue.bind(this), // 王子
                6: this.calculateKingValue.bind(this), // 国王
                7: () => 10, // 伯爵夫人（有特殊规则）
                8: () => 0 // 公主（尽量保留）
            };
            
            // 计算每张卡牌的价值
            let bestCard = cards[0];
            let bestValue = -1;
            
            cards.forEach(card => {
                const valueFunction = cardValues[card.value];
                let value = 0;
                
                if (valueFunction) {
                    try {
                        value = valueFunction(card, player);
                    } catch (e) {
                        console.error('计算卡牌价值出错:', e);
                        value = 0;
                    }
                }
                
                // 根据游戏阶段调整价值
                const gameStage = this.calculateGameStage();
                if (gameStage === 'early' && (card.value === 1 || card.value === 2)) {
                    value += 5; // 早期阶段信息收集卡牌价值更高
                } else if (gameStage === 'late' && card.value > 5) {
                    value += 5; // 后期阶段高价值卡牌更重要
                }
                
                if (value > bestValue) {
                    bestValue = value;
                    bestCard = card;
                }
            });
            
            // 添加随机因子，20%概率选择次优卡牌，避免AI行为过于可预测
            if (cards.length > 1 && Math.random() < 0.2) {
                const otherCards = cards.filter(c => c !== bestCard);
                return otherCards[Math.floor(Math.random() * otherCards.length)];
            }
            
            return bestCard;
        } catch (error) {
            console.error('AI最优卡牌选择出错:', error);
            // 兜底：随机选择一张卡牌
            return cards[Math.floor(Math.random() * cards.length)];
        }
    }
    
    // 计算游戏阶段
    calculateGameStage() {
        const totalCards = 16;
        const remainingCards = this.deck.length;
        const usedCards = totalCards - remainingCards;
        
        if (usedCards <= 4) return 'early'; // 前4张牌为早期
        if (usedCards <= 10) return 'middle'; // 中间6张为中期
        return 'late'; // 最后6张为后期
    }
    
    // 计算卫兵价值
    calculateGuardValue(card, player) {
        // 卫兵价值 = 猜测成功率 * 10 + 存活玩家数量调整
        const alivePlayers = this.players.filter(p => p.isAlive && p.id !== player.id);
        if (alivePlayers.length === 0) return 0;
        
        // 基于弃牌堆信息计算猜测成功率
        const guessSuccessRate = this.calculateGuessSuccessRate();
        
        return guessSuccessRate * 10 + alivePlayers.length;
    }
    
    // 计算猜测成功率
    calculateGuessSuccessRate() {
        // 简化版：基于弃牌堆中已出现的卡牌数量估算剩余卡牌分布
        const remainingCards = this.getRemainingCards();
        const totalRemaining = Object.values(remainingCards).reduce((sum, count) => sum + count, 0);
        
        if (totalRemaining === 0) return 0;
        
        // 优先猜测出现次数少的高价值卡牌
        const highValueCards = Object.entries(remainingCards)
            .filter(([_, value]) => parseInt(value) > 4) // 价值5及以上
            .map(([name, _]) => name);
        
        if (highValueCards.length > 0) {
            return 0.3; // 高价值卡牌猜测成功率约30%
        }
        
        return 0.2; // 其他卡牌猜测成功率约20%
    }
    
    // 获取剩余卡牌信息
    getRemainingCards() {
        const remainingCards = {};
        const totalCards = {
            '卫兵': 5, '牧师': 2, '男爵': 2, '侍女': 2, '王子': 2, '国王': 1, '伯爵夫人': 1, '公主': 1
        };
        
        // 统计弃牌堆中的卡牌
        const discardedCards = {};
        this.discardPile.forEach(card => {
            discardedCards[card.name] = (discardedCards[card.name] || 0) + 1;
        });
        
        // 计算剩余卡牌
        Object.keys(totalCards).forEach(name => {
            remainingCards[name] = totalCards[name] - (discardedCards[name] || 0);
        });
        
        return remainingCards;
    }
    
    // 计算牧师价值
    calculatePriestValue(card, player) {
        // 牧师价值 = 信息价值 + 游戏阶段调整
        const gameStage = this.calculateGameStage();
        let value = 5; // 基础价值
        
        if (gameStage === 'early' || gameStage === 'middle') {
            value += 3; // 中早期信息更重要
        }
        
        // 如果玩家持有高价值卡牌，信息收集价值降低
        if (player.hand.some(c => c.value > 5)) {
            value -= 2;
        }
        
        return value;
    }
    
    // 计算男爵价值
    calculateBaronValue(card, player) {
        // 男爵价值 = 手牌强度对比概率 * 15
        const playerHandValue = player.hand.reduce((sum, c) => sum + c.value, 0) - card.value;
        const averagePlayerValue = this.estimateAveragePlayerValue();
        
        let winProbability = 0.5; // 默认50%胜率
        if (playerHandValue > averagePlayerValue + 2) {
            winProbability = 0.8;
        } else if (playerHandValue > averagePlayerValue) {
            winProbability = 0.65;
        } else if (playerHandValue < averagePlayerValue - 2) {
            winProbability = 0.3;
        } else if (playerHandValue < averagePlayerValue) {
            winProbability = 0.4;
        }
        
        return winProbability * 15;
    }
    
    // 估算其他玩家的平均手牌价值
    estimateAveragePlayerValue() {
        // 简化版：基于剩余卡牌的平均价值估算
        const remainingCards = this.getRemainingCards();
        let totalValue = 0;
        let totalCount = 0;
        
        Object.entries(remainingCards).forEach(([name, count]) => {
            const cardValue = this.getCardValueByName(name);
            totalValue += cardValue * count;
            totalCount += count;
        });
        
        return totalCount > 0 ? totalValue / totalCount : 4; // 默认平均价值为4
    }
    
    // 根据卡牌名称获取价值
    getCardValueByName(name) {
        const valueMap = {
            '卫兵': 1, '牧师': 2, '男爵': 3, '侍女': 4, '王子': 5, '国王': 6, '伯爵夫人': 7, '公主': 8
        };
        return valueMap[name] || 0;
    }
    
    // 计算侍女价值
    calculateMaidValue(card, player) {
        // 侍女价值 = 保护需求 * 12
        let protectionNeed = 0.5; // 默认需求
        
        // 如果持有高价值卡牌，保护需求增加
        if (player.hand.some(c => c.value > 5)) {
            protectionNeed = 0.8;
        }
        
        // 如果是游戏后期，保护需求增加
        if (this.calculateGameStage() === 'late') {
            protectionNeed += 0.2;
        }
        
        // 如果存活玩家多，被攻击的概率高，保护需求增加
        const alivePlayers = this.players.filter(p => p.isAlive).length;
        if (alivePlayers > 4) {
            protectionNeed += 0.1;
        }
        
        return protectionNeed * 12;
    }
    
    // 计算王子价值
    calculatePrinceValue(card, player) {
        // 王子价值 = 目标威胁度 * 14
        const targetThreat = this.identifyHighestThreatPlayer(player.id);
        
        // 有机会迫使对手弃置公主时，价值更高
        const hasPrincessThreat = this.hasPrincessThreat();
        if (hasPrincessThreat) {
            return 18; // 高价值
        }
        
        return targetThreat * 14;
    }
    
    // 识别最高威胁的玩家
    identifyHighestThreatPlayer(avoidPlayerId) {
        // 简化版：威胁度 = 爱心标记数量 + (持有高价值卡牌的概率)
        let maxThreat = 0;
        
        this.players.forEach(player => {
            if (player.id === avoidPlayerId || !player.isAlive) return;
            
            let threat = player.hearts; // 爱心标记数量
            
            // 估算持有高价值卡牌的概率
            const highValueProbability = this.estimateHighValueCardProbability(player);
            threat += highValueProbability;
            
            if (threat > maxThreat) {
                maxThreat = threat;
            }
        });
        
        return maxThreat > 0 ? Math.min(maxThreat / 5, 1) : 0.5; // 归一化到0-1
    }
    
    // 估算玩家持有高价值卡牌的概率
    estimateHighValueCardProbability(player) {
        // 简化版：基于游戏阶段和弃牌堆信息估算
        const remainingCards = this.getRemainingCards();
        const highValueRemaining = Object.entries(remainingCards)
            .filter(([_, value]) => parseInt(value) > 5) // 价值6及以上
            .reduce((sum, [_, count]) => sum + count, 0);
        
        const totalRemaining = Object.values(remainingCards).reduce((sum, count) => sum + count, 0);
        
        return totalRemaining > 0 ? highValueRemaining / totalRemaining : 0;
    }
    
    // 检查是否有玩家可能持有公主
    hasPrincessThreat() {
        const remainingCards = this.getRemainingCards();
        return remainingCards['公主'] > 0; // 如果公主还在游戏中
    }
    
    // 计算国王价值
    calculateKingValue(card, player) {
        // 国王价值 = 手牌交换收益 * 13
        const currentHandValue = player.hand.reduce((sum, c) => sum + c.value, 0) - card.value;
        const averagePlayerValue = this.estimateAveragePlayerValue();
        
        let exchangeBenefit = 0.5; // 默认收益
        if (currentHandValue < averagePlayerValue - 1) {
            exchangeBenefit = 0.8; // 当前手牌较弱，交换有好处
        } else if (currentHandValue > averagePlayerValue + 1) {
            exchangeBenefit = 0.3; // 当前手牌较强，交换有风险
        }
        
        // 避免交换到公主的风险
        if (this.hasPrincessThreat()) {
            exchangeBenefit -= 0.2;
        }
        
        return Math.max(exchangeBenefit * 13, 3); // 最低价值为3
    }
    
    // 新增回合重置方法
    resetRound() {
        console.log(`resetRound - 开始重置回合，当前回合数: ${this.roundNumber}`);
        
        // 增加回合数（但保留第一次游戏的回合数为1）
        if (this.roundNumber > 0) {
            this.incrementRoundNumber();
            // 在日志中添加轮次开始分割线
            const logElement = document.createElement('li');
            logElement.style.textAlign = 'center';
            logElement.style.backgroundColor = 'transparent';
            logElement.style.color = '#555';
            logElement.style.fontSize = '16px';
            logElement.style.padding = '10px 0';
            logElement.style.borderBottom = '1px solid #ddd';
            logElement.textContent = `第 ${this.roundNumber} 轮 开始`;
            const logContainer = document.getElementById('log-messages');
            logContainer.prepend(logElement);
        }
        
        // 重置牌库和弃牌堆
        this.initializeDeck(); // 初始化牌库（内部已经包含洗牌逻辑）
        this.discardPile = [];
        
        // 移除顶部1张牌
        this.deck.shift();
        
        // 2人游戏额外移除3张可见牌
        if (this.players.length === 2) {
            this.deck.splice(0, 3);
        }

        // 重置所有玩家的手牌和状态
        this.players.forEach(player => {
            player.hand = [];
            player.isAlive = true;
            player.isProtected = false;
        });

        // 每位玩家抽1张起始手牌
        this.players.forEach(player => {
            if (this.deck.length > 0) {
                player.hand.push(this.deck.shift());
            }
        });

        // 选择上一轮最早被淘汰的玩家作为新一轮首发玩家
        let firstPlayerIndex = 0;
        if (this.eliminatedOrder && this.eliminatedOrder.length > 0) {
            // 使用最早被淘汰的玩家作为首发
            const firstEliminated = this.eliminatedOrder[0];
            const targetPlayer = this.players.find(p => p.name === firstEliminated);
            if (targetPlayer) {
                firstPlayerIndex = targetPlayer.id;
            }
        } else {
            // 如果没有淘汰记录，使用上一轮最后一个获胜的玩家
            const lastWinner = this.lastRoundWinner;
            if (lastWinner) {
                const targetPlayer = this.players.find(p => p.name === lastWinner);
                if (targetPlayer) {
                    firstPlayerIndex = targetPlayer.id;
                }
            }
        }
        this.currentPlayerIndex = firstPlayerIndex;

        this.gameStatus = 'playing';
        this.isReadyToPass = false;
        this.selectedCard = null;
        this.hasDrawnThisTurn = false;
        
        // 确保按钮状态正确初始化
        const playButton = document.getElementById('play-card');
        const passButton = document.getElementById('pass-player');
        if (playButton) {
            playButton.disabled = true;
        }
        if (passButton) {
            passButton.disabled = true;
        }
        
        // 确保游戏状态正确重置
        console.log(`resetRound - 重置游戏状态完成，进入第${this.roundNumber}回合`);
        
        // 显示新一轮首发玩家遮罩
        this.showFirstPlayerOverlay();
    };

    // 新增：显示首发玩家遮罩
    showFirstPlayerOverlay() {
        const overlay = document.getElementById('first-player-overlay');
        const firstPlayerName = document.getElementById('first-player-name');
        const roundInfo = document.getElementById('round-info');
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        firstPlayerName.textContent = currentPlayer.name;
        
        // 判断是游戏开始还是新一轮
        const isNewGame = this.discardPile.length === 0;
        roundInfo.textContent = isNewGame ? '游戏开始！' : '新一轮游戏开始！';
        
        overlay.classList.remove('hidden');
        
        // 设置继续按钮事件
        const continueBtn = document.getElementById('first-player-continue');
        const continueHandler = () => {
            // 移除遮罩层
            overlay.classList.add('hidden');
            continueBtn.removeEventListener('click', continueHandler);
            

            
            // 开始第一个玩家的回合
            this.logMessage(`${currentPlayer.name} 的回合开始`);
            this.startPlayerTurn(); // 调用startPlayerTurn来触发自动摸牌
        };
        
        continueBtn.addEventListener('click', continueHandler);
    };

    checkGameOver() {
        // 检查爱心标记是否达到胜利条件
        let requiredHearts = this.players.length === 2 ? 7 : this.players.length <= 4 ? 5 : 3;
        const winner = this.players.find(p => p.hearts >= requiredHearts);
        if (winner) {
            this.gameStatus = 'ended';
            this.lastRoundWinner = winner.name;
            this.showVictoryCelebration(winner.name, winner.hearts);
            this.logMessage(`游戏结束！${winner.name} 获得了 ${winner.hearts} 个爱心标记，赢得胜利！`);
            return true;
        }

        // 检查牌库是否为空
        if (this.deck.length === 0) {
            const alivePlayers = this.players.filter(p => p.isAlive);
            if (alivePlayers.length === 0) return true;

            // 计算每个玩家的手牌总值
            alivePlayers.forEach(player => {
                player.handValue = player.hand.reduce((sum, card) => sum + card.value, 0);
            });

            // 找出最高点数
            const maxHandValue = Math.max(...alivePlayers.map(p => p.handValue));
            const topPlayers = alivePlayers.filter(p => p.handValue === maxHandValue);

            // 给所有最高点数玩家添加爱心标记
            topPlayers.forEach(player => {
                player.hearts += 1;
            });

            // 记录本轮获胜者
            if (topPlayers.length === 1) {
                this.lastRoundWinner = topPlayers[0].name;
            }

            // 检查是否有人获胜
            requiredHearts = this.players.length === 2 ? 7 : this.players.length <= 4 ? 5 : 3;
            const winners = this.players.filter(p => p.hearts >= requiredHearts);
            
            if (winners.length > 0) {
                winners.sort((a, b) => b.hearts - a.hearts);
                const finalWinners = winners.filter(p => p.hearts === winners[0].hearts);
                if (finalWinners.length === 1) {
                    this.lastRoundWinner = finalWinners[0].name;
                    this.showVictoryCelebration(finalWinners[0].name, finalWinners[0].hearts);
                    this.logMessage(`游戏结束！${finalWinners[0].name} 获得了 ${finalWinners[0].hearts} 个爱心标记，赢得胜利！`);
                } else {
                    this.showTieCelebration(finalWinners);
                    this.logMessage(`游戏结束！${finalWinners.map(p => p.name).join(', ')} 平局，各获得 ${finalWinners[0].hearts} 个爱心标记！`);
                }
                this.gameStatus = 'ended';
                return true;
            } else {
                // 每轮胜利特效
                if (topPlayers.length === 1) {
                    this.showRoundVictory(topPlayers[0].name);
                } else {
                    this.showRoundTie(topPlayers);
                }
                this.logMessage(`牌库已空！${topPlayers.length > 1 ? '平局！' : topPlayers[0].name + ' 获得爱心标记！'}`);
                this.resetRound();
                return true;
            }
        }

        // 检查是否只剩一名玩家存活
        const alivePlayers = this.players.filter(p => p.isAlive);
        if (alivePlayers.length === 1) {
            alivePlayers[0].hearts += 1;
            this.lastRoundWinner = alivePlayers[0].name;
            
            // 检查是否有人获胜
            requiredHearts = this.players.length === 2 ? 7 : this.players.length <= 4 ? 5 : 3;
            if (alivePlayers[0].hearts >= requiredHearts) {
                this.showVictoryCelebration(alivePlayers[0].name, alivePlayers[0].hearts);
                this.logMessage(`游戏结束！${alivePlayers[0].name} 获胜！`);
                this.gameStatus = 'ended';
            } else {
                this.showRoundVictory(alivePlayers[0].name);
                this.logMessage(`${alivePlayers[0].name} 成为最后存活玩家，获得爱心标记！`);
                this.resetRound();
            }
            return true;
        }

        return false;
    };

    // 新增胜利庆祝特效方法
    showVictoryCelebration(winnerName, hearts) {
        this.createCelebrationModal(`🎉 恭喜 ${winnerName} 获胜！ 🎉`, 
            `<div style="text-align: center; font-size: 24px;">
                <div style="font-size: 48px; margin: 20px 0;">🏆</div>
                <div style="color: #FFD700; font-weight: bold; margin: 10px 0;">
                    ${winnerName} 获得了 ${hearts} 个爱心标记！
                </div>
                <div style="font-size: 18px; color: #666; margin: 10px 0;">
                    最终胜利！
                </div>
            </div>`);
    };

    showRoundVictory(winnerName) {
        this.createCelebrationModal(`🎊 回合胜利！ 🎊`, 
            `<div style="text-align: center; font-size: 20px;">
                <div style="font-size: 36px; margin: 15px 0;">⭐</div>
                <div style="color: #4CAF50; font-weight: bold; margin: 10px 0;">
                    ${winnerName} 获得爱心标记！
                </div>
                <div style="font-size: 16px; color: #666;">
                    下一轮即将开始...
                </div>
            </div>`, 2000);
    };

    showTieCelebration(winners) {
        const winnerNames = winners.map(p => p.name).join('、');
        this.createCelebrationModal(`🤝 平局！ 🤝`, 
            `<div style="text-align: center; font-size: 20px;">
                <div style="font-size: 36px; margin: 15px 0;">🤝</div>
                <div style="color: #FF9800; font-weight: bold; margin: 10px 0;">
                    ${winnerNames} 平局！
                </div>
                <div style="font-size: 16px; color: #666;">
                    各获得爱心标记！
                </div>
            </div>`, 2000);
    };

    showRoundTie(players) {
        const playerNames = players.map(p => p.name).join('、');
        this.createCelebrationModal(`⚖️ 回合平局！ ⚖️`, 
            `<div style="text-align: center; font-size: 20px;">
                <div style="font-size: 36px; margin: 15px 0;">⚖️</div>
                <div style="color: #2196F3; font-weight: bold; margin: 10px 0;">
                    ${playerNames} 平局！
                </div>
                <div style="font-size: 16px; color: #666;">
                    下一轮即将开始...
                </div>
            </div>`, 2000);
    };

    createCelebrationModal(title, content, autoCloseDelay = 0) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in;
        `;

        // 创建弹窗
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #fff, #f8f9fa);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: scaleIn 0.3s ease-out;
        `;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            .celebration-title {
                font-size: 28px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 20px;
                animation: bounce 1s ease-in-out;
            }
        `;

        // 创建标题
        const titleEl = document.createElement('div');
        titleEl.className = 'celebration-title';
        titleEl.textContent = title;

        // 组装弹窗
        modal.appendChild(titleEl);
        modal.insertAdjacentHTML('beforeend', content);
        overlay.appendChild(modal);

        // 添加到页面
        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // 点击关闭或自动关闭
        const closeModal = () => {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            modal.style.animation = 'scaleOut 0.3s ease-out';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        };

        // 添加关闭动画
        style.textContent += `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes scaleOut {
                from { transform: scale(1); opacity: 1; }
                to { transform: scale(0.8); opacity: 0; }
            }
        `;

        overlay.addEventListener('click', closeModal);

        // 自动关闭
        if (autoCloseDelay > 0) {
            setTimeout(closeModal, autoCloseDelay);
        }
    };

    updateUI() {
        let currentPlayer = this.players[this.currentPlayerIndex];

        // 更新玩家列表
        this.updatePlayersList();

        // 更新牌堆信息
        document.getElementById('draw-count').textContent = this.deck.length;
        document.getElementById('discard-count').textContent = this.discardPile.length;

        // 更新手牌
        const handContainer = document.getElementById('hand-container');
        handContainer.innerHTML = '';
        
        // 如果是人类玩家，显示手牌；如果是AI玩家，不显示手牌
        if (!currentPlayer.isAI) {
            handContainer.style.visibility = 'visible';
            
            currentPlayer.hand.forEach(card => {
                // 创建卡牌包装器
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'card-wrapper';
                
                // 创建卡牌元素
                const cardElement = document.createElement('div');
                cardElement.className = `card ${this.selectedCard && this.selectedCard.id === card.id ? 'selected' : ''}`;
                
                // 创建卡牌内容元素
                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';
                cardContent.textContent = `${card.name} (${card.value})`;
                
                // 将内容添加到卡牌
                cardElement.appendChild(cardContent);
                cardElement.dataset.cardId = card.id;
                
                // 创建描述元素并添加到包装器中
                const descriptionElement = document.createElement('div');
                descriptionElement.className = 'card-description';
                descriptionElement.textContent = card.description;
                
                // 添加到包装器
                cardWrapper.appendChild(cardElement);
                cardWrapper.appendChild(descriptionElement);
                
                // 控制背景变暗效果
                let cardDimmer = document.querySelector('.card-dimmer');
                if (!cardDimmer) {
                    cardDimmer = document.createElement('div');
                    cardDimmer.className = 'card-dimmer';
                    // 将dimmer添加到游戏容器中而不是body，确保正确的层级关系
                    const gameContainer = document.querySelector('.game-container') || document.body;
                    gameContainer.insertBefore(cardDimmer, gameContainer.firstChild);
                }
                
                (function(cardObj) {
                    // 点击事件
                    cardElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectCard(cardObj);
                    });
                    
                    // 鼠标悬停事件 - 显示描述和背景变暗
                    cardWrapper.addEventListener('mouseenter', () => {
                        // 只有在没有其他卡牌悬停的情况下才显示背景变暗
                        if (!document.querySelector('.card-wrapper:hover')) {
                            cardDimmer.style.opacity = '1';
                        }
                    });
                    
                    // 鼠标离开事件 - 隐藏描述和背景变暗
                    cardWrapper.addEventListener('mouseleave', () => {
                        // 延迟检查是否有其他卡牌正在被悬停
                        setTimeout(() => {
                            if (!document.querySelector('.card-wrapper:hover')) {
                                cardDimmer.style.opacity = '0';
                            }
                        }, 50);
                    });
                }).bind(this)(card);
                
                handContainer.appendChild(cardWrapper);
            });
        } else {
            // 对于AI玩家，隐藏手牌区域并显示提示信息
            handContainer.style.visibility = 'hidden';
            // 不需要特别显示AI操作中的提示，因为passPlayer方法中已经处理了这部分逻辑
        }

        // 更新按钮状态 - 严格按照游戏流程
        const playButton = document.getElementById('play-card');
        const passButton = document.getElementById('pass-player');

        if (this.gameStatus !== 'playing') {
            // 游戏未进行时，禁用所有按钮
            if (playButton) playButton.disabled = true;
            if (passButton) passButton.disabled = true;
            return;
        }

        // 游戏进行中的按钮状态控制
        if (this.isReadyToPass) {
            // 已经出牌完成，等待移交玩家
            if (playButton) playButton.disabled = true;
            if (passButton) passButton.disabled = false;
        } else {
            // 正常出牌阶段
            if (playButton) playButton.disabled = currentPlayer.hand.length === 0;
            if (passButton) passButton.disabled = true;
        }
        
        // 调试信息
        console.log('updateUI - playButton.disabled:', playButton.disabled, 'selectedCard:', !!this.selectedCard, 'handLength:', currentPlayer.hand.length);
    };

    selectCard(card) {
        // 切换选中状态：如果再次点击已选中的卡牌，则取消选中
        // 修复：确保使用卡牌对象的唯一ID进行比较
        if (this.selectedCard && this.selectedCard.id === card.id) {
            this.selectedCard = null;
        } else {
            this.selectedCard = card;
        }
        this.updateUI();
        console.log('选中卡牌:', this.selectedCard);
    };

    logMessage(message) {
        const logElement = document.createElement('li');
        logElement.textContent = message;
        const logContainer = document.getElementById('log-messages');
        logContainer.prepend(logElement);
        // 自动滚动到顶部，确保最新消息可见
        const gameLog = document.querySelector('.game-log');
        if (gameLog) {
            gameLog.scrollTop = 0;
        }
    };

    showDiscardDetails() {
        const breakdownContainer = document.getElementById('discard-breakdown');
        
        if (this.discardPile.length === 0) {
            breakdownContainer.innerHTML = '<div class="discard-item">弃牌堆为空</div>';
            return;
        }

        // 统计每种卡牌的数量
        const cardCounts = {};
        this.discardPile.forEach(card => {
            const cardName = card.name;
            cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;
        });

        // 按卡牌值排序
        const sortedCards = Object.entries(cardCounts)
            .sort((a, b) => {
                const cardA = this.discardPile.find(c => c.name === a[0]);
                const cardB = this.discardPile.find(c => c.name === b[0]);
                return cardA.value - cardB.value;
            });

        // 生成HTML
        breakdownContainer.innerHTML = '';
        sortedCards.forEach(([cardName, count]) => {
            const card = this.discardPile.find(c => c.name === cardName);
            const div = document.createElement('div');
            div.className = 'discard-item';
            div.innerHTML = `
                <span class="discard-item-name">${cardName} (${card.value})</span>
                <span class="discard-item-count">×${count}</span>
            `;
            breakdownContainer.appendChild(div);
        });
    };

    updatePlayersList() {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;

        // 清空现有内容
        playersList.innerHTML = '';

        // 按游戏顺序显示所有玩家
        this.players.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${index === this.currentPlayerIndex ? 'current' : ''} ${!player.isAlive ? 'eliminated' : ''}`;
            
            // 生成爱心标记字符串
            const hearts = '❤️'.repeat(player.hearts);
            
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-hearts">${hearts}</span>
            `;
            
            playersList.appendChild(playerItem);
        });

        // 更新胜利条件
        const victoryHearts = document.getElementById('victory-hearts');
        if (victoryHearts) {
            let requiredHearts;
            switch(this.players.length) {
                case 2:
                    requiredHearts = 7;
                    break;
                case 3:
                case 4:
                    requiredHearts = 5;
                    break;
                default: // 5-8人
                    requiredHearts = 3;
            }
            victoryHearts.textContent = '❤️'.repeat(requiredHearts);
        }
    };
}

// 初始化游戏
window.onload = function() {
    const game = new LoveLetterGame();
    const startButton = document.getElementById('start-game');
    const humanPlayerCountInput = document.getElementById('human-player-count');
    const aiPlayerCountInput = document.getElementById('ai-player-count');
    const totalPlayersInfo = document.getElementById('total-players-info');
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');

    // 更新总玩家数显示和开始按钮状态
    function updateTotalPlayers() {
        const humanCount = parseInt(humanPlayerCountInput.value);
        const aiCount = parseInt(aiPlayerCountInput.value);
        const totalCount = humanCount + aiCount;
        
        totalPlayersInfo.textContent = `总玩家数: ${totalCount} (人类: ${humanCount}, 电脑: ${aiCount})`;
        
        // 当总玩家数为1时禁用开始游戏按钮
        if (totalCount === 1) {
            startButton.disabled = true;
            totalPlayersInfo.textContent += ' - 至少需要2名玩家';
        } else if (totalCount < 2 || totalCount > 8) {
            startButton.disabled = true;
            totalPlayersInfo.textContent += ' - 请输入有效的玩家人数';
        } else {
            startButton.disabled = false;
        }
    }

    // 添加玩家数量变化事件监听
    humanPlayerCountInput.addEventListener('change', updateTotalPlayers);
    aiPlayerCountInput.addEventListener('change', updateTotalPlayers);
    
    // 初始更新
    updateTotalPlayers();

    startButton.addEventListener('click', function() {
        const humanCount = parseInt(humanPlayerCountInput.value);
        const aiCount = parseInt(aiPlayerCountInput.value);
        const totalCount = humanCount + aiCount;
        
        if (totalCount >= 2 && totalCount <= 8) {
            setupScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            game.startGame(humanCount, aiCount);
        } else {
            alert('请输入有效的玩家人数 (总玩家数2-8)');
        }
    });
};

// 为了兼容性，保留原有的setupGameUI方法
function setupGameUI() {
    // 这个方法在LoveLetterGame类中已经实现
};
