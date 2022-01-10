import { SafeMoon, SafeMoonMini } from "../typechain";

import { ethers, network } from "hardhat";
import { expect } from "chai";
import { constants, BigNumber } from "ethers";

import { autoMining, mine } from "./utils/blocks";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { utils, Wallet } = ethers;

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [owner, A, B, C, D, E, F] = signers;

    const smoon = await ethers.getContractFactory("SafeMoon");
    const sm = (await smoon.deploy()) as SafeMoon;

    const smoonMini = await ethers.getContractFactory("SafeMoonMini");
    const smini = (await smoonMini.deploy()) as SafeMoonMini;

    return {
        owner,
        A,
        B,
        C,
        D,
        E,
        F,
        sm,
        smini,
    };
};

describe("SM", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("-", async () => {
        const { owner, A, B, C, D, E, F, sm } = await setupTest();

        // await autoMining(false);
        // const users = [] as any;
        // for(let i = 0; i < 100; i++) {
        //     const user = ethers.Wallet.createRandom().connect(ethers.provider);
        //     users.push(user);
        //     await sm.transfer(user.address, utils.parseEther("1"));
        //     await owner.sendTransaction({to: user.address, value: utils.parseEther("0.1")});
        //     // mine();
        // }
        // console.log(await sm.tokenHoldersLength())

        async function show() {
            const balA = await sm.balanceOf(A.address);
            const balB = await sm.balanceOf(B.address);
            const balC = await sm.balanceOf(C.address);
            const balD = await sm.balanceOf(D.address);
            const balE = await sm.balanceOf(E.address);
            const balF = await sm.balanceOf(F.address);
            const balO = await sm.balanceOf(owner.address);

            const rbalA = await sm._rOwned(A.address);
            const rbalB = await sm._rOwned(B.address);
            const rbalC = await sm._rOwned(C.address);
            const rbalD = await sm._rOwned(D.address);
            const rbalE = await sm._rOwned(E.address);
            const rbalF = await sm._rOwned(F.address);
            const rbalO = await sm._rOwned(owner.address);

            // console.log("A ", balA);
            // console.log("B ", balB);
            // console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            // console.log("owner", balO);
            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            let rtotal = rbalA.add(rbalB).add(rbalC).add(rbalD).add(rbalE).add(rbalF).add(rbalO);
            // console.log("C_data", await sm._userInfo(C.address));
            // for(let i = 0; i < users.length; i++) {
            //     total = total.add(await sm.balanceOf(users[i].address));
            // }
            console.log("real total", total, utils.formatEther(total));
            console.log("total diff", (await sm.totalSupply()).sub(total));
            console.log("rtotal", await sm._rTotal());
            console.log("rtotal diff", (await sm._rTotal()).sub(rtotal));
            console.log("r/t rate", await sm._getRate());
            console.log("totalFees", await sm.totalFees());
            console.log();
            // const gen = await sm.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await sm.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await sm.accMultiplier(gen.sub(1))));
            console.log();
        }

        await sm.transfer(A.address, utils.parseEther("85000000"));
        await sm.transfer(B.address, utils.parseEther("5000000"));
        await sm.transfer(C.address, utils.parseEther("1"));
        await sm.transfer(D.address, utils.parseEther("1"));
        await sm.transfer(E.address, utils.parseEther("1"));
        await sm.transfer(F.address, utils.parseEther("1"));

        // console.log(await sm.tokenHoldersLength())

        await show();

        async function randomAmount(user: SignerWithAddress) {
            const bal = await sm.balanceOf(user.address);
            const randPercent = Math.floor(Math.random() * 80) + 10;
            return bal.mul(randPercent).div(100);
        }

        function randomUser() {
            const rand = Math.floor(Math.random() * 7);
            if (rand == 0) return A;
            else if (rand == 1) return B;
            else if (rand == 2) return C;
            else if (rand == 3) return D;
            else if (rand == 4) return E;
            else if (rand == 5) return F;
            else if (rand == 6) return owner;
        }

        function getUsers() {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;
            while (user0.address == user1.address) {
                user1 = randomUser() as SignerWithAddress;
            }
            return { user0, user1 };
        }

        for (let i = 0; i < 1500; i++) {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;

            await sm.connect(user0).transfer(user1.address, await randomAmount(user0));
            // console.log(i,"th");
            // await show();
            await sm.connect(B).transfer(A.address, await sm.balanceOf(B.address));
            // console.log(i,"th");
            // await show();
            if ((await sm.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
                await sm.transfer(A.address, utils.parseEther("45000000"));
            } else if ((await sm.balanceOf(A.address)).lt(utils.parseEther("5000"))) {
                const cBal = await sm.balanceOf(C.address);
                await sm.connect(C).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await sm.connect(D).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await sm.connect(E).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await sm.connect(F).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                // for(let i = 0; i < users.length; i++) {
                //     await sm.connect(users[i]).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                // }
                await sm.transfer(A.address, (await sm.balanceOf(owner.address)).sub(utils.parseEther("1")));
            }
            if ((await sm._getRate()).lte("104848721190") && i % 10 == 0) {
                console.log(i, "th");
                await show();
                if (i >= 800 && i <= 850) {
                    console.log("A_rOwn", await sm._rOwned(A.address));
                    console.log("B_rOwn", await sm._rOwned(B.address));
                }
            }
        }
        console.log("final");
        await show();
    });

    it("-2", async () => {
        const { owner, A, B, C, D, E, F, sm } = await setupTest();

        // await autoMining(false);
        // const users = [] as any;
        // for(let i = 0; i < 100; i++) {
        //     const user = ethers.Wallet.createRandom().connect(ethers.provider);
        //     users.push(user);
        //     await sm.transfer(user.address, utils.parseEther("1"));
        //     await owner.sendTransaction({to: user.address, value: utils.parseEther("0.1")});
        //     // mine();
        // }
        // console.log(await sm.tokenHoldersLength())

        async function show() {
            const balA = await sm.balanceOf(A.address);
            const balB = await sm.balanceOf(B.address);
            const balC = await sm.balanceOf(C.address);
            const balD = await sm.balanceOf(D.address);
            const balE = await sm.balanceOf(E.address);
            const balF = await sm.balanceOf(F.address);
            const balO = await sm.balanceOf(owner.address);

            const rbalA = await sm._rOwned(A.address);
            const rbalB = await sm._rOwned(B.address);
            const rbalC = await sm._rOwned(C.address);
            const rbalD = await sm._rOwned(D.address);
            const rbalE = await sm._rOwned(E.address);
            const rbalF = await sm._rOwned(F.address);
            const rbalO = await sm._rOwned(owner.address);

            // console.log("A ", balA);
            // console.log("B ", balB);
            // console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            // console.log("owner", balO);
            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            let rtotal = rbalA.add(rbalB).add(rbalC).add(rbalD).add(rbalE).add(rbalF).add(rbalO);
            // console.log("C_data", await sm._userInfo(C.address));
            // for(let i = 0; i < users.length; i++) {
            //     total = total.add(await sm.balanceOf(users[i].address));
            // }
            console.log("real total", total, utils.formatEther(total));
            console.log("total diff", (await sm.totalSupply()).sub(total));
            console.log("rtotal", await sm._rTotal());
            console.log("rtotal diff", (await sm._rTotal()).sub(rtotal));
            console.log("r/t rate", await sm._getRate());
            console.log("totalFees", await sm.totalFees());
            console.log();
            // const gen = await sm.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await sm.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await sm.accMultiplier(gen.sub(1))));
            console.log();
        }

        await sm.transfer(A.address, utils.parseEther("85000000"));
        await sm.transfer(B.address, utils.parseEther("5000000"));
        await sm.transfer(C.address, utils.parseEther("1"));
        await sm.transfer(D.address, utils.parseEther("1"));
        await sm.transfer(E.address, utils.parseEther("1"));
        await sm.transfer(F.address, utils.parseEther("1"));

        // console.log(await sm.tokenHoldersLength())

        await show();

        async function randomAmount(user: SignerWithAddress) {
            const bal = await sm.balanceOf(user.address);
            const randPercent = Math.floor(Math.random() * 80) + 10;
            return bal.mul(randPercent).div(100);
        }

        function randomUser() {
            const rand = Math.floor(Math.random() * 7);
            if (rand == 0) return A;
            else if (rand == 1) return B;
            else if (rand == 2) return C;
            else if (rand == 3) return D;
            else if (rand == 4) return E;
            else if (rand == 5) return F;
            else if (rand == 6) return owner;
        }

        function getUsers() {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;
            while (user0.address == user1.address) {
                user1 = randomUser() as SignerWithAddress;
            }
            return { user0, user1 };
        }

        for (let i = 0; i < 100000; i++) {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;

            await sm.connect(user0).transfer(user1.address, await randomAmount(user0));

            const rate_ = await sm._getRate();
            if (rate_.lte("10000000000") && i % 10 == 0) {
                // if(i % 500 == 0) {
                console.log(i, "th");
                await show();
                if (rate_.lte(10000000)) {
                    break;
                }
            }
        }
        // console.log("final");
        // await show();
    });

    it.only("-2", async () => {
        const { owner, A, B, C, D, E, F, sm } = await setupTest();

        const userNumber = 10;
        const users = [] as any;
        for(let i = 0; i < userNumber; i++) {
            const user = ethers.Wallet.createRandom().connect(ethers.provider);
            users.push(user);
            await sm.transfer(user.address, utils.parseEther("1"));
            await owner.sendTransaction({to: user.address, value: utils.parseEther("10")});
        }

        let lastRate = constants.Zero;

        async function show(specific?: boolean) {
            const balA = await sm.balanceOf(A.address);
            const balB = await sm.balanceOf(B.address);
            const balC = await sm.balanceOf(C.address);
            const balD = await sm.balanceOf(D.address);
            const balE = await sm.balanceOf(E.address);
            const balF = await sm.balanceOf(F.address);
            const balO = await sm.balanceOf(owner.address);

            let balUsers = Array.from({length: userNumber}, () => constants.Zero);
            let rbalUsers = Array.from({length: userNumber}, () => constants.Zero);
            for(let i = 0; i < userNumber; i++) {
                balUsers[i] = await sm.balanceOf(users[i].address);
                rbalUsers[i] = await sm._rOwned(users[i].address);
            }

            const rbalA = await sm._rOwned(A.address);
            const rbalB = await sm._rOwned(B.address);
            const rbalC = await sm._rOwned(C.address);
            const rbalD = await sm._rOwned(D.address);
            const rbalE = await sm._rOwned(E.address);
            const rbalF = await sm._rOwned(F.address);
            const rbalO = await sm._rOwned(owner.address);

            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            let rtotal = rbalA.add(rbalB).add(rbalC).add(rbalD).add(rbalE).add(rbalF).add(rbalO);

            for(let i = 0; i < userNumber; i++) {
                total = total.add(balUsers[i]);
                rtotal = rtotal.add(rbalUsers[i]);
            }

            console.log("real total", utils.formatEther(total));
            // console.log("real total and diff", utils.formatEther(total), utils.formatEther((await sm.totalSupply()).sub(total)));
            console.log(
                "rtotal and diff",
                (await sm._rTotal()).toString(),
                (await sm._rTotal()).sub(rtotal).toString()
            );
            const rate = (await sm._getRate());
            console.log("r/t rate", rate.toString());
            if(lastRate != constants.Zero && lastRate.lt(rate)) console.log("target point");
            lastRate = rate;
            // console.log("totalFees", await sm.totalFees());
            // console.log();

            if(specific) {
                console.log("A : ", utils.formatEther(balA), rbalA.toString());
                console.log("B : ", utils.formatEther(balB), rbalB.toString());
                console.log("C : ", utils.formatEther(balC), rbalC.toString());
                console.log("D : ", utils.formatEther(balD), rbalD.toString());
                console.log("E : ", utils.formatEther(balE), rbalE.toString());
                console.log("F : ", utils.formatEther(balF), rbalF.toString());
                console.log("O : ", utils.formatEther(balO), rbalO.toString());
                for(let i = 0; i < userNumber; i++) {
                    console.log(`user${i} : `, utils.formatEther(balUsers[i]), rbalUsers[i].toString());
                }
            }

            // const check = await sm.qqq();
            // if(check) {
            //     console.log("A : ", utils.formatEther(balA), rbalA.toString());
            //     console.log("B : ", utils.formatEther(balB), rbalB.toString());
            //     console.log("C : ", utils.formatEther(balC), rbalC.toString());
            //     console.log("D : ", utils.formatEther(balD), rbalD.toString());
            //     console.log("E : ", utils.formatEther(balE), rbalE.toString());
            //     console.log("F : ", utils.formatEther(balF), rbalF.toString());
            //     console.log("O : ", utils.formatEther(balO), rbalO.toString());
            //     for(let i = 0; i < userNumber; i++) {
            //         console.log(`user${i} : `, utils.formatEther(balUsers[i]), rbalUsers[i].toString());
            //     }
            // }

            console.log();
        }

        await sm.transfer(A.address, utils.parseEther("85000000"));
        await sm.transfer(B.address, utils.parseEther("5000000"));
        await sm.transfer(C.address, utils.parseEther("1"));
        await sm.transfer(D.address, utils.parseEther("1"));
        await sm.transfer(E.address, utils.parseEther("1"));
        await sm.transfer(F.address, utils.parseEther("1"));
        await show();

        async function randomAmount(user: SignerWithAddress) {
            const bal = await sm.balanceOf(user.address);
            // const randPercent = Math.floor(Math.random() * 80) + 10;
            const randPercent = Math.floor(Math.random() * 60) + 41;
            return bal.mul(randPercent).div(100);
        }

        function randomUser() {
            const rand = Math.floor(Math.random() * (7 + userNumber));
            if (rand == 0) return A;
            else if (rand == 1) return B;
            else if (rand == 2) return C;
            else if (rand == 3) return D;
            else if (rand == 4) return E;
            else if (rand == 5) return F;
            else if (rand == 6) return owner;
            else {
                return users[rand - 7];
            }
        }

        function getUsers() {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;
            while (user0.address == user1.address) {
                user1 = randomUser() as SignerWithAddress;
            }
            return { user0, user1 };
        }

        await sm.excludeFromReward(A.address);

        let isShow = false;

        for (let i = 0; i < 100000; i++) {
            let users = getUsers();
            while((await sm.balanceOf(users.user0.address)).isZero()) {
                users = getUsers();
            }
            
            let amount = await randomAmount(users.user0);
            await sm.connect(users.user0).transfer(users.user1.address, amount);

            const afterBal = await sm.balanceOf(users.user0.address);

            // const rate_ = await sm._getRate();
            let _lastShow;
            let _show;

            if(isShow) {
                console.log(`transfer ${amount.toString()}`)
                await show(true);
            }

            if(i > 10000) isShow = await sm.q_();

            // if(afterBal.isZero()) {
            //     console.log(i, "th");
            //     await show(true);
            // }
            
            // if (rate_.lte(150000000)) {
            //     _lastShow = true;
            // }
            // if (rate_.lte("10000000000") && i % 50 == 0 && !_lastShow) {
            //     // if(i % 500 == 0) {
            //     console.log(`${i}th low rate`);
            //     // await show();
            //     _show = true;
            // }

            // if(i >= 10000 && i % 1000 == 0 && !_show) {
            // // if (i > 0 && i % 1000 == 0 && !_show) {
            //     console.log(i, "th");
            //     // await show(true);
            //     // if(await sm.qqq()) break;
            //     if(i > 15000) await sm.qqq();
            // }

            // // if (i <= 10 || (i < 1000 && i % 100 == 0)) {
            // if (i >= 500 && (i < 10000 && i % 1000 == 0)) {
            //     console.log(i, "th");
            //     // await show();
            //     // if(await sm.qqq()) break;

            // }

            // if (_lastShow && i % 5 == 0) {
            //     console.log(i, "th");
            //     // await show();
            // }
            // // if (rate_.lte(100000000)) {
            // if (rate_.lte(50000000)) {
            //     break;
            // }
        }
        // console.log("final");
        // await show(true);

        // await sm.connect(A).transfer(B.address, await sm.balanceOf(A.address));
        // await show(true);
        // await sm.qqq();
        
        // await sm.includeInReward(A.address);
        // await show(true);
        // await sm.qqq();
    });
});

describe("SM_Mini", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("-", async () => {
        const { owner, A, B, C, D, E, F, smini } = await setupTest();

        async function show() {
            const balA = await smini.balanceOf(A.address);
            const balB = await smini.balanceOf(B.address);
            // const balC = await smini.balanceOf(C.address);
            // const balD = await smini.balanceOf(D.address);
            // const balE = await smini.balanceOf(E.address);
            // const balF = await smini.balanceOf(F.address);
            const balO = await smini.balanceOf(owner.address);

            console.log("A ", balA);
            console.log("B ", balB);
            // console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            console.log("owner", balO);

            console.log(
                "tBal Each",
                await smini._tOwned(A.address),
                await smini._tOwned(B.address),
                await smini._tOwned(owner.address)
            );
            console.log(
                "rBal Each",
                await smini._rOwned(A.address),
                await smini._rOwned(B.address),
                await smini._rOwned(owner.address)
            );

            let total = balA.add(balB).add(balO);
            // let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            // console.log("C_data", await smini._userInfo(C.address));
            // for(let i = 0; i < users.length; i++) {
            //     total = total.add(await smini.balanceOf(users[i].address));
            // }
            console.log("total", total);
            // console.log("diff", utils.parseEther("100000000").sub(total));
            // console.log("totalFees", await smini.totalFees());
            // console.log("rTotal", await smini._rTotal());
            console.log();
            // const gen = await smini.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await smini.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await smini.accMultiplier(gen.sub(1))));
            console.log();
        }

        await smini.transfer(A.address, 8000);
        await show();
        await smini.transfer(B.address, 500);
        // await smini.transfer(C.address, utils.parseEther("1"));
        // await smini.transfer(D.address, utils.parseEther("1"));
        // await smini.transfer(E.address, utils.parseEther("1"));
        // await smini.transfer(F.address, utils.parseEther("1"));

        // console.log(await smini.tokenHoldersLength())
        await show();

        await smini.excludeFromReward(A.address);
        await show();

        // for(let i = 0; i < 1; i++) {
        await smini.connect(A).transfer(B.address, 8000);
        // console.log(i,"th");
        await show();

        await smini.transfer(A.address, 1600);
        await show();

        await smini.connect(B).transfer(A.address, 8300);
        // console.log(i,"th");
        await show();
        // if((await smini.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
        //     await smini.transfer(A.address, utils.parseEther("45000000"));
        // }
        // if(i == 90) {
        // console.log(i,"th");
        // await show();
        // }
        // }
        // console.log("final");
        // await show();
        // const aBal = await smini.balanceOf(A.address);
        // console.log(`transfer aBal : ${aBal.toNumber()}`);
        // await smini.connect(A).transfer(owner.address, aBal);
        // await show();

        // await smini.includeInReward(A.address);
        // await show();
    });
});
