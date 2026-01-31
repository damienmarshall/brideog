console.log('Script loading...');

try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded');

        // State
        const state = {
            currentStage: 0, // 0: Face, 1: Dress, 2: Accessories, 3: Bag
            color: '#000000',
            tool: 'brush', // brush, eraser
            brushSize: 4
        };

        // DOM Elements - with checks
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const steps = document.querySelectorAll('.step');
        const controlGroups = document.querySelectorAll('.control-group');
        const faceCanvas = document.getElementById('face-canvas');
        const dressCanvas = document.getElementById('dress-canvas');
        const bagCanvas = document.getElementById('bag-canvas');

        if (!prevBtn || !nextBtn || !faceCanvas) {
            console.error('Critical elements missing from DOM');
            alert('Error: Application could not load. Missing elements.');
            return;
        }

        // Contexts
        const ctxFace = faceCanvas.getContext('2d');
        const ctxDress = dressCanvas.getContext('2d');
        const ctxBag = bagCanvas.getContext('2d');

        // Initialize Canvases
        console.log('Initializing Canvases');
        try {
            initCanvas(faceCanvas, ctxFace, 0);
            initCanvas(dressCanvas, ctxDress, 1);
            initCanvas(bagCanvas, ctxBag, 3);
        } catch (e) {
            console.error('Error initializing canvases:', e);
        }

        // Current active canvas for tools (clear, etc)
        function getCurrentCanvasContext() {
            if (state.currentStage === 0) return { canvas: faceCanvas, ctx: ctxFace };
            if (state.currentStage === 1) return { canvas: dressCanvas, ctx: ctxDress };
            if (state.currentStage === 3) return { canvas: bagCanvas, ctx: ctxBag };
            return null;
        }

        // Navigation Logic
        nextBtn.addEventListener('click', () => {
            console.log('Next clicked. Current Stage:', state.currentStage);
            if (state.currentStage < 4) {
                setStage(state.currentStage + 1);
            }
        });

        prevBtn.addEventListener('click', () => {
            console.log('Prev clicked');
            if (state.currentStage > 0) {
                setStage(state.currentStage - 1);
            }
        });

        function setStage(stageIndex) {
            console.log('Setting stage to:', stageIndex);
            state.currentStage = stageIndex;

            // Update Buttons
            prevBtn.disabled = stageIndex === 0;
            nextBtn.innerHTML = stageIndex === 4 ? 'Finish' : 'Next';
            if (stageIndex === 4) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'block';
            }

            // Update Progress UI
            steps.forEach(step => {
                const stepIndex = parseInt(step.dataset.step);
                step.classList.toggle('active', stepIndex <= stageIndex);
            });

            // Update Controls
            controlGroups.forEach((group) => {
                if (`stage-${stageIndex}-controls` === group.id) {
                    group.classList.remove('hidden');
                } else {
                    group.classList.add('hidden');
                }
            });

            // Update Doll View (Layers)
            const dressLayer = document.getElementById('dress-layer');
            const accLayer = document.getElementById('accessories-layer');
            const bagContainer = document.getElementById('bag-container');
            const appContainer = document.querySelector('.app-container');

            if (dressLayer) {
                if (stageIndex >= 1) dressLayer.classList.remove('hidden');
                else dressLayer.classList.add('hidden');
            }
            if (accLayer) {
                if (stageIndex >= 2) accLayer.classList.remove('hidden');
                else accLayer.classList.add('hidden');
            }
            if (bagContainer) {
                if (stageIndex >= 3) bagContainer.classList.remove('hidden');
                else bagContainer.classList.add('hidden');
            }

            // Finish State styling
            if (stageIndex === 4) {
                appContainer.classList.add('finished-state');
            } else {
                appContainer.classList.remove('finished-state');
            }
        }

        // Restart Logic
        const restartBtn = document.querySelector('[data-action="restart"]');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                console.log('Restarting');
                ctxFace.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
                ctxDress.clearRect(0, 0, dressCanvas.width, dressCanvas.height);
                ctxBag.clearRect(0, 0, bagCanvas.width, bagCanvas.height);
                document.getElementById('accessories-layer').innerHTML = '';
                setStage(0);
            });
        }

        // Drawing Logic
        function initCanvas(canvas, ctx, allowedStage) {
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;

            function startDrawing(e) {
                if (state.currentStage !== allowedStage) return;

                isDrawing = true;
                if (e.type !== 'mousedown') {
                    try {
                        canvas.setPointerCapture(e.pointerId);
                    } catch (err) {
                        console.warn('Pointer capture failed', err);
                    }
                }
                [lastX, lastY] = getCoords(e, canvas);
                // Draw a dot immediately for clicks (optional, but good for feedback)
                draw(e);
            }

            function draw(e) {
                if (!isDrawing) return;
                if (e.cancelable) e.preventDefault();

                const [x, y] = getCoords(e, canvas);

                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = state.tool === 'eraser' ? 'rgba(0,0,0,0)' : state.color;

                if (state.tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = 15;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.lineWidth = state.brushSize;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }

                ctx.stroke();
                [lastX, lastY] = [x, y];
            }

            function stopDrawing(e) {
                if (!isDrawing) return;
                isDrawing = false;
                if (e.type !== 'mouseup' && e.pointerId) {
                    try {
                        canvas.releasePointerCapture(e.pointerId);
                    } catch (err) {
                        // ignore
                    }
                }
                ctx.beginPath();
            }

            // Use Pointer Events if available, fallback to Mouse (though modern browsers support Pointer)
            if (window.PointerEvent) {
                canvas.addEventListener('pointerdown', startDrawing);
                canvas.addEventListener('pointermove', draw);
                canvas.addEventListener('pointerup', stopDrawing);
                canvas.addEventListener('pointercancel', stopDrawing);
            } else {
                // Fallback for very old browsers (unlikely)
                canvas.addEventListener('mousedown', startDrawing);
                canvas.addEventListener('mousemove', draw);
                canvas.addEventListener('mouseup', stopDrawing);
                canvas.addEventListener('mouseout', stopDrawing);
                canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); }, { passive: false });
                canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); }, { passive: false });
                canvas.addEventListener('touchend', stopDrawing);
            }
        }

        function getCoords(e, canvas) {
            const rect = canvas.getBoundingClientRect();
            // Handle both pointer/mouse and touch events
            let clientX = e.clientX;
            let clientY = e.clientY;

            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches.length > 0) { // for touchend
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return [
                (clientX - rect.left) * scaleX,
                (clientY - rect.top) * scaleY
            ];
        }

        // Accessory Logic
        document.querySelectorAll('.accessory-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const char = e.target.innerText;
                addAccessory(char);
            });
        });

        const accessoriesLayer = document.getElementById('accessories-layer');
        if (accessoriesLayer) {
            function addAccessory(char) {
                const el = document.createElement('div');
                el.classList.add('placed-accessory');
                el.innerText = char;
                el.style.left = '50%';
                el.style.top = '20%';
                el.style.transform = 'translate(-50%, -50%)';

                let isDragging = false;
                let startX, startY, initialLeft, initialTop;

                el.addEventListener('pointerdown', dragStart);

                function dragStart(e) {
                    e.preventDefault();
                    isDragging = true;
                    el.setPointerCapture(e.pointerId);

                    startX = e.clientX;
                    startY = e.clientY;
                    initialLeft = el.offsetLeft;
                    initialTop = el.offsetTop;

                    el.addEventListener('pointermove', dragMove);
                    el.addEventListener('pointerup', dragEnd);
                    el.addEventListener('pointercancel', dragEnd);
                }

                function dragMove(e) {
                    if (!isDragging) return;
                    e.preventDefault();

                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    el.style.left = `${initialLeft + dx}px`;
                    el.style.top = `${initialTop + dy}px`;
                    el.style.transform = 'none';
                }

                function dragEnd(e) {
                    isDragging = false;
                    el.releasePointerCapture(e.pointerId);
                    el.removeEventListener('pointermove', dragMove);
                    el.removeEventListener('pointerup', dragEnd);
                    el.removeEventListener('pointercancel', dragEnd);
                }

                accessoriesLayer.appendChild(el);
            }
        }

        // Clear Accessories
        const clearAccBtn = document.querySelector('[data-action="clear-acc"]');
        if (clearAccBtn) {
            clearAccBtn.addEventListener('click', () => {
                accessoriesLayer.innerHTML = '';
            });
        }

        // Palette & Tools Interaction
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                e.target.parentElement.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');
                state.color = e.target.dataset.color;
                if (state.tool === 'eraser') state.tool = 'brush';
                updateToolsUI();
            });
        });

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool;
                const action = e.target.dataset.action;

                if (action === 'clear') {
                    const current = getCurrentCanvasContext();
                    if (current) {
                        current.ctx.clearRect(0, 0, current.canvas.width, current.canvas.height);
                    }
                    return;
                }

                if (tool) {
                    state.tool = tool;
                    updateToolsUI();
                }
            });
        });

        function updateToolsUI() {
            document.querySelectorAll('.tool-btn').forEach(btn => {
                if (btn.dataset.tool === state.tool) {
                    btn.classList.add('active');
                } else if (btn.dataset.tool) {
                    btn.classList.remove('active');
                }
            });
        }

        console.log('Script initialized successfully');
    });
} catch (globalError) {
    console.error('Global Script Error:', globalError);
    alert('An error occurred while loading the application: ' + globalError.message);
}
