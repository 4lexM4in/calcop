// Скрипт для главной страницы (расчет нагрузки)

document.addEventListener('DOMContentLoaded', () => {
    // Обработчики для модального окна норм
    const normsModal = document.getElementById('norms-modal');
    const normsButton = document.getElementById('norms-button');
    const closeNormsModal = document.getElementById('close-norms-modal');
    const cancelNorms = document.getElementById('cancel-norms');
    const saveNorms = document.getElementById('save-norms');

    // Хранилище текущих значений норм
    let currentNormValues = {};
    // Флаг, указывающий, были ли когда-либо сохранены значения
    let hasAppliedValues = false;

    // Открытие модального окна
    if (normsButton) {
        normsButton.addEventListener('click', () => {
            if (normsModal) {
                normsModal.classList.add('is-active');
                
                // После загрузки норм через HTMX, сохраняем исходные значения
                setTimeout(() => {
                    const normInputs = document.querySelectorAll('.norm-input');
                    normInputs.forEach(input => {
                        const normId = input.dataset.id;
                        
                        // Если у нас уже есть сохраненное значение для этой нормы, используем его
                        if (hasAppliedValues && currentNormValues[normId] !== undefined) {
                            input.value = currentNormValues[normId];
                        } else if (!hasAppliedValues) {
                            // Только при первом открытии сохраняем исходные значения из БД
                            currentNormValues[normId] = input.value;
                        }
                    });
                }, 500); // Даем время на загрузку данных через HTMX
            }
        });
    }

    // Закрытие модального окна
    function closeModal() {
        if (normsModal) {
            normsModal.classList.remove('is-active');
        }
    }

    if (closeNormsModal) {
        closeNormsModal.addEventListener('click', closeModal);
    }

    // Обработка кнопки "Отмена" - восстанавливаем последние примененные значения (если есть)
    if (cancelNorms) {
        cancelNorms.addEventListener('click', () => {
            const normInputs = document.querySelectorAll('.norm-input');
            
            // Если были ранее сохраненные значения, восстанавливаем их
            if (hasAppliedValues) {
                normInputs.forEach(input => {
                    const normId = input.dataset.id;
                    if (currentNormValues[normId] !== undefined) {
                        input.value = currentNormValues[normId];
                    }
                });
            }
            
            closeModal();
        });
    }

    // Обработка кнопки "Применить" - сохраняем текущие значения и закрываем модальное окно
    if (saveNorms) {
        saveNorms.addEventListener('click', () => {
            // Сохраняем текущие значения из полей ввода
            const normInputs = document.querySelectorAll('.norm-input');
            normInputs.forEach(input => {
                const normId = input.dataset.id;
                currentNormValues[normId] = input.value;
            });
            
            // Устанавливаем флаг, что значения были применены
            hasAppliedValues = true;
            
            // Показываем уведомление об успешном применении
            showNotification('Изменения применены');
            
            // Закрываем модальное окно
            closeModal();
        });
    }

    // Функция для добавления значений норм из модального окна в форму расчета
    function addNormInputsToForm() {
        const normsContainer = document.getElementById('norms-values-container');
        if (normsContainer) {
            normsContainer.innerHTML = ''; // Очищаем контейнер
            
            // Получаем все инпуты норм из модального окна
            const normInputs = document.querySelectorAll('.norm-input');
            
            normInputs.forEach(input => {
                const normId = input.dataset.id;
                const normValue = input.value;
                
                // Создаем скрытый инпут для каждой нормы
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = `norm_${normId}`;
                hiddenInput.value = normValue;
                
                normsContainer.appendChild(hiddenInput);
            });
        }
    }
    
    // Перехватываем отправку формы, чтобы добавить значения норм
    const form = document.getElementById('calculation-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            // Добавляем значения норм в форму перед отправкой
            addNormInputsToForm();
        });
    }
    
    // Обновляем функцию сохранения норм
    if (saveNorms) {
        const originalSaveHandler = saveNorms.onclick;
        saveNorms.addEventListener('click', function() {
            // Добавляем значения норм в форму при сохранении
            addNormInputsToForm();
            // Вызываем оригинальный обработчик, если он есть
            if (originalSaveHandler) {
                originalSaveHandler.call(this);
            }
        });
    }
});