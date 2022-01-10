import { InjeolmiV2 } from "../typechain";

import { ethers, network } from "hardhat";
import { expect } from "chai";
import { constants } from "ethers";

import {autoMining, mine} from "./utils/blocks";

const { BigNumber, utils, Wallet } = ethers;

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [owner, A, B, C, D, E, F] = signers;

    const Injeolmi = await ethers.getContractFactory("InjeolmiV2");
    const ij = (await Injeolmi.deploy()) as InjeolmiV2;

    expect(await ij.balanceOf(owner.address)).to.be.equal(utils.parseEther("100000000"));

    return {
        owner,
        A,
        B,
        C,
        D,
        E,
        F,
        ij,
    };
};

describe("InjeolmiV2", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("-", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        // await autoMining(false);
        // const users = [] as any;
        // for(let i = 0; i < 500; i++) {
        //     const user = ethers.Wallet.createRandom();
        //     users.push(user);
        //     await ij.transfer(user.address, utils.parseEther("1"));
        //     mine();
        // }
        // console.log(await ij.tokenHoldersLength())

        async function show() {
            const balA = await ij.balanceOf(A.address);
            const balB = await ij.balanceOf(B.address);
            const balC = await ij.balanceOf(C.address);
            const balD = await ij.balanceOf(D.address);
            const balE = await ij.balanceOf(E.address);
            const balF = await ij.balanceOf(F.address);
            const balO = await ij.balanceOf(owner.address);

            // console.log("A ", balA);
            // console.log("B ", balB);
            // console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            // console.log("owner", balO);
            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            // console.log("C_data", await ij._userInfo(C.address));
            // for(let i = 0; i < users.length; i++) {
            //     total = total.add(await ij.balanceOf(users[i].address));
            // }
            console.log("total", total);
            console.log("diff", utils.parseEther("100000000").sub(total));
            console.log();
            // const gen = await ij.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await ij.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));

        // console.log(await ij.tokenHoldersLength())

        await show();

        for(let i = 0; i < 91; i++) {
            await ij.connect(A).transfer(B.address, constants.MaxUint256);
            console.log(i,"th");
            await show();
            await ij.connect(B).transfer(A.address, constants.MaxUint256);
            console.log(i,"th");
            await show();
            if((await ij.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
                await ij.transfer(A.address, utils.parseEther("45000000"));
            }
            // if(i == 90) {
            //     console.log(i,"th");
            //     await show();
            // }
        }
        console.log("final");
        await show();
    });

    it("-2", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        await autoMining(false);
        const users = [] as any;
        for(let i = 0; i < 500; i++) {
            const user = ethers.Wallet.createRandom();
            users.push(user);
            await ij.transfer(user.address, utils.parseEther("1"));
            mine();
        }
        console.log(await ij.tokenHoldersLength())

        async function show() {
            console.log("A ", (await ij.balanceOf(A.address)));
            console.log("B ", (await ij.balanceOf(B.address)));
            console.log("C ", (await ij.balanceOf(C.address)));
            console.log("D ", (await ij.balanceOf(D.address)));
            console.log("E ", (await ij.balanceOf(E.address)));
            console.log("F ", (await ij.balanceOf(F.address)));
            console.log("owner ", (await ij.balanceOf(owner.address)));
            let total = (await ij.balanceOf(A.address)).add((await ij.balanceOf(B.address)).add((await ij.balanceOf(C.address)).add((await ij.balanceOf(D.address)).add((await ij.balanceOf(E.address)).add((await ij.balanceOf(F.address)).add((await ij.balanceOf(owner.address))))))));
            for(let i = 0; i < users.length; i++) {
                total = total.add(await ij.balanceOf(users[i].address));
            }
            console.log("total", total);
            console.log("diff", utils.parseEther("100000000").sub(total));
            console.log();
            const gen = await ij.generation();
            console.log("Gen ", gen);
            console.log("accMul ", (await ij.accMultiplier(gen)));
            if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));
        await mine();

        console.log(await ij.tokenHoldersLength())

        await show();

        const num = 500;
        for(let i = 0; i < num; i++) {
            await ij.connect(A).transfer(B.address, constants.MaxUint256);
            // await mine();
            await ij.connect(B).transfer(A.address, constants.MaxUint256);
            await mine();
            if((await ij.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
                await ij.transfer(A.address, utils.parseEther("45000000"));
                await mine();
            }
            if(i > 0 && i % 50 == 0) {
                console.log(i,"th");
                await show();
            }
        }
        console.log(`${num}th`);
        await show();
    });

    it("-3", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        // await autoMining(false);
        const users = [] as any;
        for(let i = 0; i < 500; i++) {
            const user = ethers.Wallet.createRandom().connect(ethers.provider);
            users.push(user);
            await ij.transfer(user.address, utils.parseEther("1"));
            await owner.sendTransaction({to: user.address, value: utils.parseEther("0.1")});
            mine();
        }
        // console.log(await ij.tokenHoldersLength())

        async function show() {
            const balA = await ij.balanceOf(A.address);
            const balB = await ij.balanceOf(B.address);
            const balC = await ij.balanceOf(C.address);
            const balD = await ij.balanceOf(D.address);
            const balE = await ij.balanceOf(E.address);
            const balF = await ij.balanceOf(F.address);
            const balO = await ij.balanceOf(owner.address);

            console.log("A ", balA);
            console.log("B ", balB);
            console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            console.log("owner", balO);
            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            // console.log("C_data", await ij._userInfo(C.address));
            for(let i = 0; i < users.length; i++) {
                total = total.add(await ij.balanceOf(users[i].address));
            }
            console.log("total", total);
            console.log("diff", utils.parseEther("100000000").sub(total));
            console.log();
            const gen = await ij.generation();
            console.log("Gen ", gen);
            console.log("accMul ", (await ij.accMultiplier(gen)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));

        // console.log(await ij.tokenHoldersLength())

        await show();

        for(let i = 0; i < 100; i++) {
            // let target = Math.floor(Math.random() * 500);
            // await ij.connect(A).transfer(users[target].address, utils.parseEther("10000"));
            await ij.connect(A).transfer(B.address, constants.MaxUint256);
            await ij.connect(B).transfer(A.address, constants.MaxUint256);
            if((await ij.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
                await ij.transfer(A.address, utils.parseEther("45000000"));
            }
        }
        console.log(100, "th");
        await show();

        const cBal = await ij.balanceOf(C.address);
        console.log("cBal ",cBal);

        console.log(await ij.tokenHoldersLength())  //506

        for(let i = 0; i < 500; i++) {
            await ij.connect(users[i]).transfer(A.address, constants.MaxUint256);
            console.log(await ij.tokenHoldersLength())
            // await ij.connect(users[i]).transfer(A.address, cBal.sub(utils.parseEther("1")));
        }
        // console.log("collect to A");
        // await show();

        // const aBal = await ij.balanceOf(A.address);
        // console.log(aBal, aBal.div(5000).div(utils.parseEther("1")));
        // for(let i = 0; i < 5000; i++) {
        //     let target = Math.floor(Math.random() * 500);
        //     await ij.connect(A).transfer(users[target].address, aBal.div(5000));
        // }



        console.log("final");
        await show();
    });

    it.only("-4", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        // await autoMining(false);
        const users = [] as any;
        for(let i = 0; i < 100; i++) {
            const user = ethers.Wallet.createRandom().connect(ethers.provider);
            users.push(user);
            await ij.transfer(user.address, utils.parseEther("1"));
            await owner.sendTransaction({to: user.address, value: utils.parseEther("0.1")});
            // mine();
        }
        // console.log(await ij.tokenHoldersLength())

        async function show() {
            const balA = await ij.balanceOf(A.address);
            const balB = await ij.balanceOf(B.address);
            const balC = await ij.balanceOf(C.address);
            const balD = await ij.balanceOf(D.address);
            const balE = await ij.balanceOf(E.address);
            const balF = await ij.balanceOf(F.address);
            const balO = await ij.balanceOf(owner.address);

            // console.log("A ", balA);
            // console.log("B ", balB);
            // console.log("C ", balC);
            // console.log("D ", balD);
            // console.log("E ", balE);
            // console.log("F ", balF);
            // console.log("owner", balO);
            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            // console.log("C_data", await ij._userInfo(C.address));
            for(let i = 0; i < users.length; i++) {
                total = total.add(await ij.balanceOf(users[i].address));
            }
            console.log("real total", total);
            console.log("diff", utils.parseEther("100000000").sub(total));
            console.log("totalFees", await ij.totalFees());
            console.log();
            const gen = await ij.generation();
            console.log("Gen ", gen);
            console.log("accMul ", (await ij.accMultiplier(gen)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));

        // console.log(await ij.tokenHoldersLength())

        await show();

        for(let i = 0; i < 1500; i++) {
            await ij.connect(A).transfer(B.address, constants.MaxUint256);
            // console.log(i,"th");
            // await show();
            await ij.connect(B).transfer(A.address, constants.MaxUint256);
            // console.log(i,"th");
            // await show();
            if((await ij.balanceOf(owner.address)).gt(utils.parseEther("50000000"))) {
                await ij.transfer(A.address, utils.parseEther("45000000"));
            } else if((await ij.balanceOf(A.address)).lt(utils.parseEther("5000"))) {
                const cBal = await ij.balanceOf(C.address);
                await ij.connect(C).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await ij.connect(D).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await ij.connect(E).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                await ij.connect(F).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                for(let i = 0; i < users.length; i++) {
                    await ij.connect(users[i]).transfer(owner.address, cBal.sub(utils.parseEther("1")));
                }
                await ij.transfer(A.address, (await ij.balanceOf(owner.address)).sub(utils.parseEther("1")));
            }
            if(i > 0 && i % 100 == 0) {
                console.log(i,"th");
                await show();
            }
        }
        console.log("final");
        await show();
    });
});
