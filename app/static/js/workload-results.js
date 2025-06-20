// Скрипт для страницы результатов расчета

document.addEventListener('DOMContentLoaded', () => {
    // Получаем коэффициент затратности из данных на странице
    const costCoefficientElement = document.getElementById('cost-coefficient-value');
    if (costCoefficientElement) {
        const currentCoefficient = parseFloat(costCoefficientElement.textContent.trim());
        
        // Загрузка настроек и проверка коэффициента затратности
        loadCostCoefficientSettings()
            .then(data => {
                checkCostCoefficient(currentCoefficient, data);
            });
    }
    
    // Обработчик для модального окна сохранения
    const saveButton = document.getElementById('save-to-cabinet');
    const saveModal = document.getElementById('save-workload-modal');
    const closeModalButton = document.getElementById('close-save-modal');
    const cancelSaveButton = document.getElementById('cancel-save');
    
    // Функция открытия модального окна
    function openSaveModal() {
        saveModal.classList.add('is-active');
    }
    
    // Функция закрытия модального окна
    function closeSaveModal() {
        saveModal.classList.remove('is-active');
    }
    
    // Назначаем обработчики событий
    if (saveButton) {
        saveButton.addEventListener('click', openSaveModal);
    }
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeSaveModal);
    }
    
    if (cancelSaveButton) {
        cancelSaveButton.addEventListener('click', closeSaveModal);
    }
    
    // Обработчик закрытия модального окна по клику на фон
    if (saveModal) {
        saveModal.addEventListener('click', function(e) {
            if (e.target === saveModal.querySelector('.modal-background')) {
                closeSaveModal();
            }
        });
    }
});